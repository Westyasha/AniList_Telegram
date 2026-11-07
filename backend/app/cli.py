import argparse
import asyncio
import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.dialects.postgresql import insert

from app.config import Settings
from app.db.database import Database
from app.db.repositories import normalize_layout, normalize_notifications
from app.db.schema import KeyValueRow, NavigationRow, SentNotificationRow, ShortTextRow, UserRow


def _ts(value: Any) -> datetime | None:
    return datetime.fromtimestamp(int(value), UTC) if value else None


def _json(value: Any) -> Any:
    if value is None:
        return None
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return None


def read_sqlite(path: Path) -> dict[str, list[dict[str, Any]]]:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        return {
            name: [dict(row) for row in conn.execute(f"SELECT * FROM {name}")]
            for name in ("users", "sent_notifications", "kv", "navigation", "short_texts")
            if name in tables
        }
    finally:
        conn.close()


async def import_sqlite(path: Path) -> dict[str, int]:
    data = read_sqlite(path)
    settings = Settings()
    db = Database(settings.database_url.get_secret_value())
    await db.connect()
    counts: dict[str, int] = {}
    async with db.begin() as conn:
        users = [
            {
                "user_id": row["user_id"],
                "lang": row.get("lang") or "ru",
                "anilist_id": row.get("anilist_id"),
                "anilist_name": row.get("anilist_name"),
                "token_enc": row.get("token_enc"),
                "token_expires_at": _ts(row.get("token_expires_at")),
                "score_format": row.get("score_format") or "POINT_10",
                "title_language": row.get("title_language") or "ENGLISH",
                "notifications": normalize_notifications(_json(row.get("notifications"))),
                "keyboard_layout": normalize_layout(_json(row.get("keyboard_layout"))),
                "last_notification": row.get("last_notification") or 0,
                "blocked": bool(row.get("blocked")),
                "created_at": _ts(row.get("created_at")) or datetime.now(UTC),
            }
            for row in data.get("users", [])
        ]
        if users:
            await conn.execute(insert(UserRow).values(users).on_conflict_do_nothing(index_elements=["user_id"]))
        counts["users"] = len(users)
        sent = [
            {
                "user_id": row["user_id"],
                "kind": row["kind"],
                "media_id": row["media_id"],
                "episode": row["episode"],
                "sent_at": _ts(row["sent_at"]),
            }
            for row in data.get("sent_notifications", [])
        ]
        if sent:
            await conn.execute(insert(SentNotificationRow).values(sent).on_conflict_do_nothing())
        counts["sent_notifications"] = len(sent)
        navigation = [
            {"target": row["target"], "stack": _json(row["stack"]) or [], "updated_at": _ts(row["updated_at"])}
            for row in data.get("navigation", [])
        ]
        if navigation:
            await conn.execute(insert(NavigationRow).values(navigation).on_conflict_do_nothing())
        counts["navigation"] = len(navigation)
        texts = [
            {"digest": row["digest"], "value": row["value"], "created_at": _ts(row["created_at"])}
            for row in data.get("short_texts", [])
        ]
        if texts:
            await conn.execute(insert(ShortTextRow).values(texts).on_conflict_do_nothing())
        counts["short_texts"] = len(texts)
        kv = [
            {"key": row["key"], "value": row["value"]} for row in data.get("kv", []) if row["key"] != "legacy_imported"
        ]
        if kv:
            await conn.execute(insert(KeyValueRow).values(kv).on_conflict_do_nothing())
        counts["kv"] = len(kv)
    await db.close()
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    importer = commands.add_parser("import-sqlite", help="Copy data from the SQLite database of v2.0")
    importer.add_argument("path", type=Path)
    args = parser.parse_args()
    if args.command == "import-sqlite":
        counts = asyncio.run(import_sqlite(args.path))
        print(json.dumps(counts))


if __name__ == "__main__":
    main()
