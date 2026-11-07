import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert

from app.db.database import Database
from app.db.models import (
    ACCENTS,
    APPEARANCE_DEFAULTS,
    DEFAULT_LAYOUT,
    MENU_BUTTONS,
    NOTIFICATION_DEFAULTS,
    THEMES,
    User,
)
from app.db.schema import (
    ImageCacheRow,
    KeyValueRow,
    NavigationRow,
    OAuthPendingRow,
    OAuthStateRow,
    SentNotificationRow,
    ShortTextRow,
    UserRow,
)
from app.security import TokenCipher


def utcnow() -> datetime:
    return datetime.now(UTC)


def to_datetime(epoch: int) -> datetime | None:
    return datetime.fromtimestamp(epoch, UTC) if epoch else None


def to_epoch(value: datetime | None) -> int:
    return int(value.timestamp()) if value else 0


def normalize_layout(layout: Any) -> list[list[str]]:
    if not isinstance(layout, list):
        return [row[:] for row in DEFAULT_LAYOUT]
    aliases = {
        "menu_search": "search",
        "menu_mylist": "list",
        "menu_trending": "trending",
        "menu_schedule": "schedule",
        "menu_season": "season",
        "menu_profile": "profile",
        "menu_settings": "settings",
    }
    seen: set[str] = set()
    rows: list[list[str]] = []
    for raw_row in layout:
        if not isinstance(raw_row, list):
            continue
        row = []
        for key in raw_row:
            name = aliases.get(key, key)
            if name in MENU_BUTTONS and name not in seen:
                seen.add(name)
                row.append(name)
        if row:
            rows.append(row[:3])
    if "settings" not in seen:
        rows.append(["settings"])
    return rows


def normalize_notifications(saved: Any) -> dict[str, bool]:
    values = saved if isinstance(saved, dict) else {}
    return {**NOTIFICATION_DEFAULTS, **{k: bool(v) for k, v in values.items() if k in NOTIFICATION_DEFAULTS}}


def normalize_appearance(saved: Any) -> dict[str, str]:
    values = saved if isinstance(saved, dict) else {}
    result = dict(APPEARANCE_DEFAULTS)
    if values.get("theme") in THEMES:
        result["theme"] = values["theme"]
    if values.get("accent") in ACCENTS:
        result["accent"] = values["accent"]
    return result


class UserRepository:
    def __init__(self, db: Database, cipher: TokenCipher) -> None:
        self._db = db
        self._cipher = cipher

    def _to_user(self, row: Any) -> User:
        return User(
            user_id=row.user_id,
            lang=row.lang,
            anilist_id=row.anilist_id,
            anilist_name=row.anilist_name,
            token=self._cipher.decrypt(row.token_enc),
            token_expires_at=to_epoch(row.token_expires_at),
            score_format=row.score_format,
            title_language=row.title_language,
            notifications=normalize_notifications(row.notifications),
            keyboard_layout=normalize_layout(row.keyboard_layout),
            last_notification=row.last_notification,
            appearance=normalize_appearance(row.appearance),
        )

    async def get(self, user_id: int) -> User | None:
        async with self._db.connection() as conn:
            row = (await conn.execute(select(UserRow).where(UserRow.user_id == user_id))).first()
        return self._to_user(row) if row else None

    async def get_or_create(self, user_id: int, language_code: str | None = None) -> User:
        user = await self.get(user_id)
        if user:
            return user
        lang = "ru" if (language_code or "ru").split("-")[0] in {"ru", "uk", "be", "kk"} else "en"
        async with self._db.begin() as conn:
            await conn.execute(
                insert(UserRow).values(user_id=user_id, lang=lang).on_conflict_do_nothing(index_elements=["user_id"])
            )
        user = User(user_id=user_id, lang=lang)
        user.is_new = True
        return user

    async def _update(self, user_id: int, **values: Any) -> None:
        async with self._db.begin() as conn:
            await conn.execute(update(UserRow).where(UserRow.user_id == user_id).values(**values))

    async def set_lang(self, user_id: int, lang: str) -> None:
        await self._update(user_id, lang=lang)

    async def set_auth(
        self,
        user_id: int,
        *,
        token: str,
        expires_at: int,
        anilist_id: int,
        anilist_name: str,
        score_format: str,
        title_language: str,
    ) -> None:
        values = {
            "token_enc": self._cipher.encrypt(token),
            "token_expires_at": to_datetime(expires_at),
            "anilist_id": anilist_id,
            "anilist_name": anilist_name,
            "score_format": score_format,
            "title_language": title_language,
            "last_notification": 0,
            "blocked": False,
        }
        async with self._db.begin() as conn:
            await conn.execute(
                insert(UserRow)
                .values(user_id=user_id, **values)
                .on_conflict_do_update(index_elements=["user_id"], set_={**values, "updated_at": func.now()})
            )

    async def update_profile(self, user_id: int, *, anilist_name: str, score_format: str, title_language: str) -> None:
        await self._update(user_id, anilist_name=anilist_name, score_format=score_format, title_language=title_language)

    async def clear_auth(self, user_id: int) -> None:
        async with self._db.begin() as conn:
            await conn.execute(
                update(UserRow)
                .where(UserRow.user_id == user_id)
                .values(token_enc=None, token_expires_at=None, anilist_id=None, anilist_name=None)
            )
            await conn.execute(delete(ImageCacheRow).where(ImageCacheRow.user_id == user_id))

    async def set_notifications(self, user_id: int, settings: dict[str, bool]) -> None:
        await self._update(user_id, notifications=normalize_notifications(settings))

    async def set_appearance(self, user_id: int, appearance: dict[str, Any]) -> dict[str, str]:
        clean = normalize_appearance(appearance)
        await self._update(user_id, appearance=clean)
        return clean

    async def set_layout(self, user_id: int, layout: list[list[str]]) -> None:
        await self._update(user_id, keyboard_layout=normalize_layout(layout))

    async def set_last_notification(self, user_id: int, notification_id: int) -> None:
        await self._update(user_id, last_notification=notification_id)

    async def set_blocked(self, user_id: int, blocked: bool) -> None:
        await self._update(user_id, blocked=blocked)

    async def notifiable(self) -> list[User]:
        query = select(UserRow).where(
            UserRow.token_enc.is_not(None), UserRow.anilist_id.is_not(None), UserRow.blocked.is_(False)
        )
        async with self._db.connection() as conn:
            rows = (await conn.execute(query)).all()
        users = [self._to_user(row) for row in rows]
        return [u for u in users if u.token and u.notifications.get("enabled")]

    async def stats(self) -> tuple[int, int]:
        async with self._db.connection() as conn:
            row = (await conn.execute(select(func.count(), func.count(UserRow.token_enc)))).one()
        return int(row[0]), int(row[1])


class ImageCacheRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def get(self, user_id: int, kind: str, digest: str, ttl: int) -> str | None:
        query = select(ImageCacheRow.file_id).where(
            ImageCacheRow.user_id == user_id,
            ImageCacheRow.kind == kind,
            ImageCacheRow.digest == digest,
            ImageCacheRow.created_at > utcnow() - timedelta(seconds=ttl),
        )
        async with self._db.connection() as conn:
            return (await conn.execute(query)).scalar_one_or_none()

    async def set(self, user_id: int, kind: str, digest: str, file_id: str) -> None:
        values = {"digest": digest, "file_id": file_id, "created_at": utcnow()}
        async with self._db.begin() as conn:
            await conn.execute(
                insert(ImageCacheRow)
                .values(user_id=user_id, kind=kind, **values)
                .on_conflict_do_update(index_elements=["user_id", "kind"], set_=values)
            )

    async def clear(self, user_id: int) -> None:
        async with self._db.begin() as conn:
            await conn.execute(delete(ImageCacheRow).where(ImageCacheRow.user_id == user_id))


class NotificationLog:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def mark(self, user_id: int, kind: str, media_id: int, episode: int = 0) -> bool:
        statement = (
            insert(SentNotificationRow)
            .values(user_id=user_id, kind=kind, media_id=media_id, episode=episode)
            .on_conflict_do_nothing()
            .returning(SentNotificationRow.user_id)
        )
        async with self._db.begin() as conn:
            return (await conn.execute(statement)).first() is not None

    async def prune(self, older_than: int) -> None:
        async with self._db.begin() as conn:
            await conn.execute(
                delete(SentNotificationRow).where(
                    SentNotificationRow.sent_at < utcnow() - timedelta(seconds=older_than)
                )
            )


class NavigationRepository:
    def __init__(self, db: Database, depth: int = 12) -> None:
        self._db = db
        self._depth = depth

    async def get(self, target: str) -> list[str]:
        async with self._db.connection() as conn:
            stack = (await conn.execute(select(NavigationRow.stack).where(NavigationRow.target == target))).scalar()
        return [str(item) for item in stack] if isinstance(stack, list) else []

    async def set(self, target: str, stack: list[str]) -> None:
        values = {"stack": stack[-self._depth :], "updated_at": utcnow()}
        async with self._db.begin() as conn:
            await conn.execute(
                insert(NavigationRow)
                .values(target=target, **values)
                .on_conflict_do_update(index_elements=["target"], set_=values)
            )

    async def prune(self, older_than: int) -> None:
        async with self._db.begin() as conn:
            await conn.execute(
                delete(NavigationRow).where(NavigationRow.updated_at < utcnow() - timedelta(seconds=older_than))
            )


class OAuthStateRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def create(self, nonce: str, user_id: int, chat_id: int | None, message_id: int | None, ttl: int) -> None:
        async with self._db.begin() as conn:
            await conn.execute(delete(OAuthStateRow).where(OAuthStateRow.expires_at < utcnow()))
            await conn.execute(
                insert(OAuthStateRow).values(
                    nonce=nonce,
                    user_id=user_id,
                    chat_id=chat_id,
                    message_id=message_id,
                    expires_at=utcnow() + timedelta(seconds=ttl),
                )
            )

    async def peek(self, nonce: str) -> dict[str, Any] | None:
        query = select(OAuthStateRow).where(OAuthStateRow.nonce == nonce, OAuthStateRow.expires_at >= utcnow())
        async with self._db.connection() as conn:
            row = (await conn.execute(query)).first()
        return dict(row._mapping) if row else None

    async def consume(self, nonce: str) -> dict[str, Any] | None:
        async with self._db.begin() as conn:
            row = (
                await conn.execute(
                    delete(OAuthStateRow).where(OAuthStateRow.nonce == nonce).returning(*OAuthStateRow.__table__.c)
                )
            ).first()
        if row is None or row.expires_at < utcnow():
            return None
        return dict(row._mapping)


class OAuthPendingRepository:
    def __init__(self, db: Database, cipher: TokenCipher) -> None:
        self._db = db
        self._cipher = cipher

    async def save(
        self,
        *,
        nonce: str,
        csrf: str,
        state: dict[str, Any],
        token: str,
        token_expires_at: int,
        viewer: dict[str, Any],
        ttl: int,
    ) -> None:
        values = {
            "csrf": csrf,
            "user_id": state["user_id"],
            "chat_id": state.get("chat_id"),
            "message_id": state.get("message_id"),
            "token_enc": self._cipher.encrypt(token),
            "token_expires_at": to_datetime(token_expires_at) or utcnow() + timedelta(days=365),
            "viewer": viewer,
            "expires_at": utcnow() + timedelta(seconds=ttl),
        }
        async with self._db.begin() as conn:
            await conn.execute(delete(OAuthPendingRow).where(OAuthPendingRow.expires_at < utcnow()))
            await conn.execute(
                insert(OAuthPendingRow)
                .values(nonce=nonce, **values)
                .on_conflict_do_update(index_elements=["nonce"], set_=values)
            )

    async def get(self, nonce: str) -> dict[str, Any] | None:
        query = select(OAuthPendingRow).where(OAuthPendingRow.nonce == nonce, OAuthPendingRow.expires_at >= utcnow())
        async with self._db.connection() as conn:
            row = (await conn.execute(query)).first()
        if row is None:
            return None
        data = dict(row._mapping)
        data["token"] = self._cipher.decrypt(data.pop("token_enc"))
        data["token_expires_at"] = to_epoch(data["token_expires_at"])
        return data

    async def delete(self, nonce: str) -> None:
        async with self._db.begin() as conn:
            await conn.execute(delete(OAuthPendingRow).where(OAuthPendingRow.nonce == nonce))


class TextRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def put(self, value: str) -> str:
        digest = hashlib.blake2b(value.encode(), digest_size=5).hexdigest()
        async with self._db.begin() as conn:
            await conn.execute(
                insert(ShortTextRow)
                .values(digest=digest, value=value)
                .on_conflict_do_update(index_elements=["digest"], set_={"created_at": utcnow()})
            )
        return digest

    async def get(self, digest: str) -> str | None:
        async with self._db.connection() as conn:
            return (await conn.execute(select(ShortTextRow.value).where(ShortTextRow.digest == digest))).scalar()


class KeyValueRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def get(self, key: str) -> str | None:
        async with self._db.connection() as conn:
            return (await conn.execute(select(KeyValueRow.value).where(KeyValueRow.key == key))).scalar()

    async def set(self, key: str, value: str) -> None:
        async with self._db.begin() as conn:
            await conn.execute(
                insert(KeyValueRow)
                .values(key=key, value=value)
                .on_conflict_do_update(index_elements=["key"], set_={"value": value})
            )
