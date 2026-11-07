import time
from collections import OrderedDict


class TokenBucket:
    def __init__(self, rate: float, burst: int, max_keys: int = 10000) -> None:
        self.rate = rate
        self.burst = burst
        self._buckets: OrderedDict[str, tuple[float, float]] = OrderedDict()
        self._max_keys = max_keys

    def allow(self, key: str, cost: float = 1.0) -> bool:
        now = time.monotonic()
        tokens, updated = self._buckets.get(key, (float(self.burst), now))
        tokens = min(float(self.burst), tokens + (now - updated) * self.rate)
        allowed = tokens >= cost
        if allowed:
            tokens -= cost
        self._buckets[key] = (tokens, now)
        self._buckets.move_to_end(key)
        while len(self._buckets) > self._max_keys:
            self._buckets.popitem(last=False)
        return allowed
