from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import String, and_, cast, func, literal_column, or_, select, text

from app.db.database import Database
from app.db.schema import UserActivityRow, UserRow

USER_SORTS = ("seen", "joined", "active")


def _iso(value: datetime | None) -> int | None:
    return int(value.timestamp()) if value else None


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class AdminQueries:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def overview(self) -> dict[str, Any]:
        now = datetime.now(UTC)
        today = now.date()
        midnight = datetime(today.year, today.month, today.day, tzinfo=UTC)
        linked = UserRow.token_enc.is_not(None)
        notify_on = and_(
            linked, UserRow.notifications["enabled"].as_boolean().is_not(False), UserRow.blocked.is_(False)
        )
        users = select(
            func.count(),
            func.count().filter(linked),
            func.count().filter(UserRow.blocked.is_(True)),
            func.count().filter(UserRow.created_at >= midnight),
            func.count().filter(UserRow.created_at >= now - timedelta(days=7)),
            func.count().filter(UserRow.last_seen_at >= now - timedelta(hours=1)),
            func.count().filter(UserRow.last_seen_at >= now - timedelta(hours=24)),
            func.count().filter(notify_on),
        )
        active = select(
            func.count(func.distinct(UserActivityRow.user_id)).filter(UserActivityRow.day == today),
            func.count(func.distinct(UserActivityRow.user_id)).filter(UserActivityRow.day > today - timedelta(days=7)),
            func.count(func.distinct(UserActivityRow.user_id)).filter(UserActivityRow.day > today - timedelta(days=30)),
            func.coalesce(func.sum(UserActivityRow.bot_events).filter(UserActivityRow.day == today), 0),
            func.coalesce(func.sum(UserActivityRow.app_events).filter(UserActivityRow.day == today), 0),
        ).where(UserActivityRow.day > today - timedelta(days=30))
        langs = select(UserRow.lang, func.count()).group_by(UserRow.lang).order_by(func.count().desc())
        async with self._db.connection() as conn:
            u = (await conn.execute(users)).one()
            a = (await conn.execute(active)).one()
            lang_rows = (await conn.execute(langs)).all()
        return {
            "total": u[0],
            "linked": u[1],
            "blocked": u[2],
            "new_today": u[3],
            "new_7d": u[4],
            "seen_1h": u[5],
            "seen_24h": u[6],
            "notifiable": u[7],
            "dau": a[0],
            "wau": a[1],
            "mau": a[2],
            "events_today": {"bot": int(a[3]), "app": int(a[4])},
            "langs": {row[0]: row[1] for row in lang_rows},
        }

    async def daily(self, days: int = 30) -> list[dict[str, Any]]:
        today = datetime.now(UTC).date()
        start = today - timedelta(days=days - 1)
        activity = (
            select(
                UserActivityRow.day,
                func.count(func.distinct(UserActivityRow.user_id)),
                func.sum(UserActivityRow.bot_events),
                func.sum(UserActivityRow.app_events),
            )
            .where(UserActivityRow.day >= start)
            .group_by(UserActivityRow.day)
        )
        day = func.date(func.timezone("UTC", UserRow.created_at))
        joined = select(day, func.count()).where(day >= start).group_by(day)
        async with self._db.connection() as conn:
            active_rows = {row[0]: row for row in (await conn.execute(activity)).all()}
            joined_rows = {row[0]: row[1] for row in (await conn.execute(joined)).all()}
        points = []
        for offset in range(days):
            current = start + timedelta(days=offset)
            row = active_rows.get(current)
            points.append(
                {
                    "day": current.isoformat(),
                    "active": row[1] if row else 0,
                    "bot": int(row[2]) if row else 0,
                    "app": int(row[3]) if row else 0,
                    "joined": joined_rows.get(current, 0),
                }
            )
        return points

    async def users(
        self, query: str = "", sort: str = "seen", offset: int = 0, limit: int = 30, online: set[int] | None = None
    ) -> dict[str, Any]:
        week = datetime.now(UTC).date() - timedelta(days=6)
        events = (
            select(
                UserActivityRow.user_id,
                func.sum(UserActivityRow.bot_events + UserActivityRow.app_events).label("events"),
            )
            .where(UserActivityRow.day >= week)
            .group_by(UserActivityRow.user_id)
            .subquery()
        )
        events_col = func.coalesce(events.c.events, 0)
        statement = select(
            UserRow.user_id,
            UserRow.lang,
            UserRow.anilist_id,
            UserRow.anilist_name,
            (UserRow.token_enc.is_not(None)).label("linked"),
            UserRow.blocked,
            UserRow.last_seen_at,
            UserRow.created_at,
            events_col.label("events"),
        ).outerjoin(events, events.c.user_id == UserRow.user_id)
        needle = query.strip().lstrip("@")[:64]
        if needle:
            pattern = f"%{_escape_like(needle)}%"
            conditions = [UserRow.anilist_name.ilike(pattern, escape="\\")]
            if needle.isdigit():
                conditions.append(cast(UserRow.user_id, String).like(f"{needle}%"))
            statement = statement.where(or_(*conditions))
        if sort == "joined":
            order = [UserRow.created_at.desc()]
        elif sort == "active":
            order = [events_col.desc(), UserRow.last_seen_at.desc().nulls_last()]
        else:
            order = [UserRow.last_seen_at.desc().nulls_last(), UserRow.created_at.desc()]
        count_statement = select(func.count()).select_from(statement.subquery())
        statement = statement.order_by(*order, UserRow.user_id).offset(offset).limit(limit)
        async with self._db.connection() as conn:
            total = (await conn.execute(count_statement)).scalar_one()
            rows = (await conn.execute(statement)).all()
        online = online or set()
        return {
            "total": total,
            "items": [
                {
                    "id": row.user_id,
                    "lang": row.lang,
                    "anilist_id": row.anilist_id,
                    "anilist_name": row.anilist_name,
                    "linked": bool(row.linked),
                    "blocked": bool(row.blocked),
                    "online": row.user_id in online,
                    "last_seen": _iso(row.last_seen_at),
                    "joined": _iso(row.created_at),
                    "events_7d": int(row.events),
                }
                for row in rows
            ],
        }

    async def user_days(self, user_id: int, days: int = 30) -> list[dict[str, Any]]:
        start = datetime.now(UTC).date() - timedelta(days=days - 1)
        statement = (
            select(UserActivityRow.day, UserActivityRow.bot_events, UserActivityRow.app_events)
            .where(UserActivityRow.user_id == user_id, UserActivityRow.day >= start)
            .order_by(UserActivityRow.day)
        )
        async with self._db.connection() as conn:
            rows = {row[0]: row for row in (await conn.execute(statement)).all()}
        points = []
        for offset in range(days):
            current = start + timedelta(days=offset)
            row = rows.get(current)
            points.append({"day": current.isoformat(), "bot": row[1] if row else 0, "app": row[2] if row else 0})
        return points

    async def database(self) -> dict[str, Any]:
        tables = text(
            "SELECT relname, n_live_tup, pg_total_relation_size(relid) FROM pg_stat_user_tables "
            "ORDER BY pg_total_relation_size(relid) DESC"
        )
        async with self._db.connection() as conn:
            size = (await conn.execute(select(func.pg_database_size(func.current_database())))).scalar_one()
            connections = (
                await conn.execute(
                    text(
                        "SELECT count(*), count(*) FILTER (WHERE state = 'active') "
                        "FROM pg_stat_activity WHERE datname = current_database()"
                    )
                )
            ).one()
            version = (await conn.execute(select(literal_column("current_setting('server_version')")))).scalar_one()
            rows = (await conn.execute(tables)).all()
        pool = self._db.engine.pool
        checked_out = getattr(pool, "checkedout", lambda: None)()
        pool_size = getattr(pool, "size", lambda: None)()
        return {
            "version": version,
            "size_mb": round(size / 1048576, 1),
            "connections": connections[0],
            "active_connections": connections[1],
            "pool": {"size": pool_size, "checked_out": checked_out},
            "tables": [{"name": row[0], "rows": row[1], "size_kb": round(row[2] / 1024)} for row in rows],
        }
