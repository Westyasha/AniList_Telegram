from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine


class Database:
    def __init__(self, url: str, pool_size: int = 5) -> None:
        self.url = url
        self._pool_size = pool_size
        self._engine: AsyncEngine | None = None

    @property
    def engine(self) -> AsyncEngine:
        if self._engine is None:
            raise RuntimeError("Database is not connected")
        return self._engine

    async def connect(self) -> None:
        self._engine = create_async_engine(
            self.url,
            pool_size=self._pool_size,
            max_overflow=self._pool_size,
            pool_pre_ping=True,
            pool_recycle=1800,
        )
        async with self._engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    async def close(self) -> None:
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None

    @asynccontextmanager
    async def begin(self) -> AsyncIterator[AsyncConnection]:
        async with self.engine.begin() as conn:
            yield conn

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[AsyncConnection]:
        async with self.engine.connect() as conn:
            yield conn
