import json
from collections.abc import Mapping
from typing import Any

from aiogram.fsm.state import State
from aiogram.fsm.storage.base import BaseStorage, StorageKey

from app.db.database import Database


def _key(key: StorageKey) -> str:
    return f"{key.bot_id}:{key.chat_id}:{key.user_id}:{key.thread_id or 0}:{key.destiny}"


class SQLiteStorage(BaseStorage):
    def __init__(self, db: Database) -> None:
        self._db = db

    async def set_state(self, key: StorageKey, state: str | State | None = None) -> None:
        value = state.state if isinstance(state, State) else state
        await self._db.execute(
            """
            INSERT INTO fsm (key, state, data) VALUES (?, ?, '{}')
            ON CONFLICT(key) DO UPDATE SET state = excluded.state
            """,
            (_key(key), value),
        )

    async def get_state(self, key: StorageKey) -> str | None:
        row = await self._db.fetchone("SELECT state FROM fsm WHERE key = ?", (_key(key),))
        return row["state"] if row else None

    async def set_data(self, key: StorageKey, data: Mapping[str, Any]) -> None:
        await self._db.execute(
            """
            INSERT INTO fsm (key, state, data) VALUES (?, NULL, ?)
            ON CONFLICT(key) DO UPDATE SET data = excluded.data
            """,
            (_key(key), json.dumps(dict(data), ensure_ascii=False)),
        )

    async def get_data(self, key: StorageKey) -> dict[str, Any]:
        row = await self._db.fetchone("SELECT data FROM fsm WHERE key = ?", (_key(key),))
        if not row or not row["data"]:
            return {}
        try:
            data = json.loads(row["data"])
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    async def close(self) -> None:
        return None
