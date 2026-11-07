import asyncio
import logging
import time
from datetime import UTC, datetime

from app.db.repositories import ActivityRepository

log = logging.getLogger(__name__)

FLUSH_INTERVAL = 60.0
ONLINE_WINDOW = 300
FORGET_AFTER = 3600


class ActivityTracker:
    def __init__(self, repository: ActivityRepository) -> None:
        self._repository = repository
        self._pending: dict[int, list[int]] = {}
        self._seen: dict[int, float] = {}
        self._task: asyncio.Task[None] | None = None

    def touch(self, user_id: int, source: str = "bot") -> None:
        counts = self._pending.setdefault(user_id, [0, 0])
        counts[0 if source == "bot" else 1] += 1
        self._seen[user_id] = time.time()

    def online(self, seconds: int = ONLINE_WINDOW) -> int:
        edge = time.time() - seconds
        return sum(1 for seen in self._seen.values() if seen >= edge)

    def online_ids(self, seconds: int = ONLINE_WINDOW) -> set[int]:
        edge = time.time() - seconds
        return {user_id for user_id, seen in self._seen.items() if seen >= edge}

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._run(), name="activity")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        await self.flush()

    async def _run(self) -> None:
        while True:
            await asyncio.sleep(FLUSH_INTERVAL)
            try:
                await self.flush()
            except Exception:
                log.exception("Activity flush failed")

    async def flush(self) -> None:
        edge = time.time() - FORGET_AFTER
        for user_id in [user_id for user_id, seen in self._seen.items() if seen < edge]:
            del self._seen[user_id]
        if not self._pending:
            return
        pending, self._pending = self._pending, {}
        now = datetime.now(UTC)
        try:
            await self._repository.record(now.date(), {k: (v[0], v[1]) for k, v in pending.items()}, now)
        except Exception:
            for user_id, (bot, app) in pending.items():
                counts = self._pending.setdefault(user_id, [0, 0])
                counts[0] += bot
                counts[1] += app
            raise
