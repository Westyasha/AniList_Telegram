import asyncio
import hashlib
import json
import logging
import time
from collections import OrderedDict, deque
from typing import Any

import aiohttp

API_URL = "https://graphql.anilist.co"
USER_AGENT = "AniListTelegram/2.0 (+https://github.com/Westyasha/AniList_Telegram)"

log = logging.getLogger(__name__)


class AniListError(Exception):
    def __init__(self, message: str, status: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status = status

    @property
    def not_found(self) -> bool:
        return self.status == 404

    @property
    def unauthorized(self) -> bool:
        return self.status == 401 or "invalid token" in self.message.lower()


class RateLimitedError(AniListError):
    def __init__(self, retry_after: float) -> None:
        super().__init__("Too Many Requests", 429)
        self.retry_after = retry_after


class SlidingWindowLimiter:
    def __init__(self, limit: int, window: float = 60.0) -> None:
        self._limit = limit
        self._window = window
        self._calls: deque[float] = deque()
        self._lock = asyncio.Lock()
        self._blocked_until = 0.0

    def block(self, seconds: float) -> None:
        self._blocked_until = max(self._blocked_until, time.monotonic() + seconds)

    async def acquire(self) -> None:
        async with self._lock:
            while True:
                now = time.monotonic()
                if now < self._blocked_until:
                    await asyncio.sleep(self._blocked_until - now)
                    continue
                while self._calls and now - self._calls[0] >= self._window:
                    self._calls.popleft()
                if len(self._calls) < self._limit:
                    self._calls.append(now)
                    return
                await asyncio.sleep(self._window - (now - self._calls[0]) + 0.05)


class TTLCache:
    def __init__(self, maxsize: int = 2048) -> None:
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._maxsize = maxsize

    def get(self, key: str) -> Any | None:
        item = self._data.get(key)
        if item is None:
            return None
        expires, value = item
        if expires < time.monotonic():
            self._data.pop(key, None)
            return None
        self._data.move_to_end(key)
        return value

    def set(self, key: str, value: Any, ttl: float) -> None:
        self._data[key] = (time.monotonic() + ttl, value)
        self._data.move_to_end(key)
        while len(self._data) > self._maxsize:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()


def _cache_key(document: str, variables: dict[str, Any] | None, token: str | None) -> str:
    raw = json.dumps([document, variables or {}, token or ""], sort_keys=True, ensure_ascii=False)
    return hashlib.blake2b(raw.encode(), digest_size=16).hexdigest()


class AniListClient:
    def __init__(self, rate_limit: int = 27, timeout: float = 20.0) -> None:
        self._limiter = SlidingWindowLimiter(rate_limit)
        self._cache = TTLCache()
        self._timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: aiohttp.ClientSession | None = None
        self._inflight: dict[str, asyncio.Future[dict[str, Any]]] = {}

    async def start(self) -> None:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=self._timeout,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    @property
    def session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            raise RuntimeError("AniListClient is not started")
        return self._session

    def invalidate(self) -> None:
        self._cache.clear()

    async def query(
        self,
        document: str,
        variables: dict[str, Any] | None = None,
        *,
        token: str | None = None,
        ttl: float = 0,
    ) -> dict[str, Any]:
        if ttl <= 0:
            return await self._execute(document, variables, token)
        key = _cache_key(document, variables, token)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        pending = self._inflight.get(key)
        if pending is not None:
            return await asyncio.shield(pending)
        future: asyncio.Future[dict[str, Any]] = asyncio.get_running_loop().create_future()
        self._inflight[key] = future
        try:
            data = await self._execute(document, variables, token)
            self._cache.set(key, data, ttl)
            future.set_result(data)
            return data
        except BaseException as exc:
            future.set_exception(exc)
            future.exception()
            raise
        finally:
            self._inflight.pop(key, None)

    async def _execute(self, document: str, variables: dict[str, Any] | None, token: str | None) -> dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        payload = {"query": document, "variables": variables or {}}
        last_error: AniListError | None = None
        for attempt in range(3):
            await self._limiter.acquire()
            try:
                async with self.session.post(API_URL, json=payload, headers=headers) as resp:
                    if resp.status == 429:
                        retry_after = float(resp.headers.get("Retry-After") or 30)
                        self._limiter.block(retry_after)
                        last_error = RateLimitedError(retry_after)
                        log.warning("AniList rate limited, retry in %.0fs", retry_after)
                        if attempt < 2 and retry_after <= 65:
                            continue
                        raise last_error
                    remaining = resp.headers.get("X-RateLimit-Remaining")
                    if remaining is not None and remaining.isdigit() and int(remaining) <= 1:
                        self._limiter.block(5)
                    if resp.status >= 500:
                        last_error = AniListError(f"AniList is unavailable ({resp.status})", resp.status)
                        await asyncio.sleep(1 + attempt)
                        continue
                    body = await resp.json(content_type=None)
            except (TimeoutError, aiohttp.ClientError) as exc:
                last_error = AniListError(f"Network error: {exc.__class__.__name__}", 503)
                await asyncio.sleep(1 + attempt)
                continue
            return self._unwrap(body, resp.status)
        raise last_error or AniListError("AniList request failed")

    @staticmethod
    def _unwrap(body: Any, status: int) -> dict[str, Any]:
        if not isinstance(body, dict):
            raise AniListError("Malformed AniList response", status)
        errors = body.get("errors") or []
        data = body.get("data")
        if errors and not any(v is not None for v in (data or {}).values()):
            first = errors[0]
            message = str(first.get("message") or "AniList error")
            code = int(first.get("status") or status or 500)
            raise AniListError(message, code)
        if errors:
            log.debug("AniList partial errors: %s", errors)
        return data or {}
