import asyncio
import json
import logging
import sqlite3
import time
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import aiosqlite

from app.security import TokenCipher

log = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id            INTEGER PRIMARY KEY,
    lang               TEXT    NOT NULL DEFAULT 'ru',
    anilist_id         INTEGER,
    anilist_name       TEXT,
    token_enc          TEXT,
    token_expires_at   INTEGER NOT NULL DEFAULT 0,
    score_format       TEXT    NOT NULL DEFAULT 'POINT_10',
    title_language     TEXT    NOT NULL DEFAULT 'ENGLISH',
    notifications      TEXT,
    keyboard_layout    TEXT,
    last_notification  INTEGER NOT NULL DEFAULT 0,
    blocked            INTEGER NOT NULL DEFAULT 0,
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS users_anilist ON users(anilist_id);

CREATE TABLE IF NOT EXISTS image_cache (
    user_id    INTEGER NOT NULL,
    kind       TEXT    NOT NULL,
    digest     TEXT    NOT NULL,
    file_id    TEXT    NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind)
);

CREATE TABLE IF NOT EXISTS sent_notifications (
    user_id  INTEGER NOT NULL,
    kind     TEXT    NOT NULL,
    media_id INTEGER NOT NULL,
    episode  INTEGER NOT NULL DEFAULT 0,
    sent_at  INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind, media_id, episode)
);

CREATE TABLE IF NOT EXISTS navigation (
    target     TEXT PRIMARY KEY,
    stack      TEXT    NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_states (
    nonce      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    chat_id    INTEGER,
    message_id INTEGER,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS short_texts (
    digest     TEXT PRIMARY KEY,
    value      TEXT    NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fsm (
    key   TEXT PRIMARY KEY,
    state TEXT,
    data  TEXT
);

CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

SCHEMA_VERSION = 2

LEGACY_NOTIFICATION_KEYS = {
    "enabled": "enabled",
    "airing_watching": "airing_watching",
    "airing_planned": "airing_planning",
    "airing_paused": "airing_paused",
    "airing_dropped": "airing_dropped",
    "related_addition": "related",
}


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._conn: aiosqlite.Connection | None = None

    @property
    def conn(self) -> aiosqlite.Connection:
        if self._conn is None:
            raise RuntimeError("Database is not connected")
        return self._conn

    async def connect(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = await aiosqlite.connect(self.path)
        self._conn.row_factory = aiosqlite.Row
        await self._conn.execute("PRAGMA journal_mode=WAL")
        await self._conn.execute("PRAGMA synchronous=NORMAL")
        await self._conn.execute("PRAGMA foreign_keys=ON")

    async def close(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    async def migrate(self, cipher: TokenCipher, legacy_path: Path | None = None) -> None:
        version = (await self.fetchone("PRAGMA user_version"))[0]
        if version < SCHEMA_VERSION:
            await self.conn.executescript(SCHEMA)
            await self.conn.execute(f"PRAGMA user_version={SCHEMA_VERSION}")
            await self.conn.commit()
        if legacy_path and await asyncio.to_thread(self._is_other_file, legacy_path):
            await self._import_legacy(legacy_path, cipher)

    def _is_other_file(self, path: Path) -> bool:
        return path.exists() and path.resolve() != self.path.resolve()

    async def _import_legacy(self, legacy_path: Path, cipher: TokenCipher) -> None:
        marker = await self.fetchone("SELECT value FROM kv WHERE key = 'legacy_imported'")
        if marker:
            return
        source = sqlite3.connect(legacy_path)
        source.row_factory = sqlite3.Row
        try:
            columns = {row[1] for row in source.execute("PRAGMA table_info(users)")}
            rows = source.execute("SELECT * FROM users").fetchall() if columns else []
        finally:
            source.close()
        now = int(time.time())
        imported = 0
        for row in rows:
            data = dict(row)
            token = data.get("token")
            notifications = self._legacy_notifications(data.get("notif_settings"), data.get("notifications"))
            await self.conn.execute(
                """
                INSERT OR IGNORE INTO users (
                    user_id, lang, anilist_id, token_enc, notifications, keyboard_layout,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["user_id"],
                    data.get("lang") or "ru",
                    data.get("anilist_id") if token else None,
                    cipher.encrypt(token) if token else None,
                    json.dumps(notifications),
                    data.get("keyboard_layout"),
                    now,
                    now,
                ),
            )
            imported += 1
        await self.conn.execute("INSERT OR REPLACE INTO kv (key, value) VALUES ('legacy_imported', ?)", (str(now),))
        await self.conn.commit()
        log.info("Imported %d users from legacy database %s", imported, legacy_path)

    @staticmethod
    def _legacy_notifications(raw: str | None, enabled: int | None) -> dict[str, bool]:
        result: dict[str, bool] = {}
        try:
            saved = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            saved = {}
        for old, new in LEGACY_NOTIFICATION_KEYS.items():
            if old in saved:
                result[new] = bool(saved[old])
        if enabled is not None and "enabled" not in result:
            result["enabled"] = bool(enabled)
        return result

    async def execute(self, sql: str, params: Iterable[Any] = ()) -> None:
        await self.conn.execute(sql, tuple(params))
        await self.conn.commit()

    async def fetchone(self, sql: str, params: Iterable[Any] = ()) -> aiosqlite.Row | None:
        async with self.conn.execute(sql, tuple(params)) as cursor:
            return await cursor.fetchone()

    async def fetchall(self, sql: str, params: Iterable[Any] = ()) -> list[aiosqlite.Row]:
        async with self.conn.execute(sql, tuple(params)) as cursor:
            return list(await cursor.fetchall())
