from collections.abc import Mapping
from typing import Any

from aiogram.fsm.state import State
from aiogram.fsm.storage.base import BaseStorage, StorageKey
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db.database import Database
from app.db.schema import FsmRow


def _key(key: StorageKey) -> str:
    return f"{key.bot_id}:{key.chat_id}:{key.user_id}:{key.thread_id or 0}:{key.destiny}"


class PostgresStorage(BaseStorage):
    def __init__(self, db: Database) -> None:
        self._db = db

    async def set_state(self, key: StorageKey, state: str | State | None = None) -> None:
        value = state.state if isinstance(state, State) else state
        async with self._db.begin() as conn:
            await conn.execute(
                insert(FsmRow)
                .values(key=_key(key), state=value, data={})
                .on_conflict_do_update(index_elements=["key"], set_={"state": value})
            )

    async def get_state(self, key: StorageKey) -> str | None:
        async with self._db.connection() as conn:
            return (await conn.execute(select(FsmRow.state).where(FsmRow.key == _key(key)))).scalar()

    async def set_data(self, key: StorageKey, data: Mapping[str, Any]) -> None:
        payload = dict(data)
        async with self._db.begin() as conn:
            await conn.execute(
                insert(FsmRow)
                .values(key=_key(key), state=None, data=payload)
                .on_conflict_do_update(index_elements=["key"], set_={"data": payload})
            )

    async def get_data(self, key: StorageKey) -> dict[str, Any]:
        async with self._db.connection() as conn:
            data = (await conn.execute(select(FsmRow.data).where(FsmRow.key == _key(key)))).scalar()
        return dict(data) if isinstance(data, dict) else {}

    async def close(self) -> None:
        return None
