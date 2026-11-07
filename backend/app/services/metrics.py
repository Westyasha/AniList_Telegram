import asyncio
import logging
import os
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any

import psutil

BOUNDS = (
    5,
    10,
    20,
    35,
    50,
    75,
    100,
    150,
    200,
    300,
    400,
    500,
    750,
    1000,
    1500,
    2000,
    3000,
    5000,
    7500,
    10000,
    20000,
    30000,
)
MINUTES = 24 * 60
SAMPLE_INTERVAL = 5.0


@dataclass(slots=True)
class Bucket:
    minute: int
    count: int = 0
    errors: int = 0
    total: float = 0.0
    peak: float = 0.0
    timed: int = 0
    hist: list[int] = field(default_factory=lambda: [0] * (len(BOUNDS) + 1))


def _slot(value: float) -> int:
    for index, bound in enumerate(BOUNDS):
        if value <= bound:
            return index
    return len(BOUNDS)


def _percentile(hist: list[int], total: int, q: float, peak: float) -> float:
    if total <= 0:
        return 0.0
    rank = q * total
    seen = 0
    for index, amount in enumerate(hist):
        if amount and seen + amount >= rank:
            if index >= len(BOUNDS):
                return round(peak, 1)
            lower = BOUNDS[index - 1] if index else 0
            upper = min(BOUNDS[index], peak) if peak else BOUNDS[index]
            within = (rank - seen) / amount
            return round(lower + max(0.0, upper - lower) * within, 1)
        seen += amount
    return round(peak, 1)


class Timeline:
    def __init__(self, minutes: int = MINUTES) -> None:
        self._buckets: deque[Bucket] = deque(maxlen=minutes)

    def _bucket(self, now: float) -> Bucket:
        minute = int(now // 60)
        if not self._buckets or self._buckets[-1].minute != minute:
            self._buckets.append(Bucket(minute))
        return self._buckets[-1]

    def record(self, ms: float | None = None, *, error: bool = False, now: float | None = None) -> None:
        bucket = self._bucket(time.time() if now is None else now)
        bucket.count += 1
        if error:
            bucket.errors += 1
        if ms is not None:
            bucket.timed += 1
            bucket.total += ms
            bucket.peak = max(bucket.peak, ms)
            bucket.hist[_slot(ms)] += 1

    def window(self, minutes: int, now: float | None = None) -> list[Bucket]:
        edge = int((time.time() if now is None else now) // 60) - minutes
        return [bucket for bucket in self._buckets if bucket.minute > edge]

    def summary(self, minutes: int, now: float | None = None) -> dict[str, float]:
        buckets = self.window(minutes, now)
        return _merge(buckets, minutes)

    def series(self, minutes: int, step: int, now: float | None = None) -> list[dict[str, float]]:
        current = int((time.time() if now is None else now) // 60) - 1
        start = current - minutes + 1
        groups: dict[int, list[Bucket]] = {}
        for bucket in self._buckets:
            if bucket.minute >= start:
                groups.setdefault((bucket.minute - start) // step, []).append(bucket)
        points = []
        for index in range((minutes + step - 1) // step):
            merged = _merge(groups.get(index, []), step)
            points.append({"t": (start + index * step) * 60, **merged})
        return points


def _merge(buckets: list[Bucket], minutes: int) -> dict[str, float]:
    count = sum(b.count for b in buckets)
    errors = sum(b.errors for b in buckets)
    timed = sum(b.timed for b in buckets)
    total = sum(b.total for b in buckets)
    peak = max((b.peak for b in buckets), default=0.0)
    hist = [sum(b.hist[i] for b in buckets) for i in range(len(BOUNDS) + 1)]
    return {
        "count": count,
        "errors": errors,
        "rate": round(count / max(minutes, 1), 2),
        "avg": round(total / timed, 1) if timed else 0.0,
        "p50": _percentile(hist, timed, 0.5, peak),
        "p95": _percentile(hist, timed, 0.95, peak),
        "max": round(peak, 1),
    }


@dataclass(slots=True)
class GaugeBucket:
    minute: int
    total: float = 0.0
    samples: int = 0
    peak: float = 0.0


class Gauge:
    def __init__(self, minutes: int = MINUTES) -> None:
        self._buckets: deque[GaugeBucket] = deque(maxlen=minutes)
        self.last = 0.0

    def set(self, value: float, now: float | None = None) -> None:
        minute = int((time.time() if now is None else now) // 60)
        if not self._buckets or self._buckets[-1].minute != minute:
            self._buckets.append(GaugeBucket(minute))
        bucket = self._buckets[-1]
        bucket.total += value
        bucket.samples += 1
        bucket.peak = max(bucket.peak, value)
        self.last = value

    def series(self, minutes: int, step: int, now: float | None = None) -> list[dict[str, float]]:
        current = int((time.time() if now is None else now) // 60) - 1
        start = current - minutes + 1
        groups: dict[int, list[GaugeBucket]] = {}
        for bucket in self._buckets:
            if bucket.minute >= start:
                groups.setdefault((bucket.minute - start) // step, []).append(bucket)
        points = []
        for index in range((minutes + step - 1) // step):
            items = groups.get(index, [])
            samples = sum(b.samples for b in items)
            points.append(
                {
                    "t": (start + index * step) * 60,
                    "avg": round(sum(b.total for b in items) / samples, 2) if samples else None,
                    "max": round(max((b.peak for b in items), default=0.0), 2) if samples else None,
                }
            )
        return points

    def peak(self, minutes: int, now: float | None = None) -> float:
        edge = int((time.time() if now is None else now) // 60) - minutes
        return max((b.peak for b in self._buckets if b.minute > edge), default=0.0)


@dataclass(slots=True)
class ErrorRecord:
    at: float
    source: str
    kind: str
    message: str


class Metrics:
    def __init__(self) -> None:
        self.started = time.time()
        self.updates = Timeline()
        self.update_kinds: dict[str, Timeline] = {}
        self.api = Timeline()
        self.anilist = Timeline()
        self.anilist_calls = Timeline()
        self.anilist_limited = Timeline()
        self.renders = Timeline()
        self.notifications = Timeline()
        self.errors = Timeline()
        self.warnings = Timeline()
        self.recent_errors: deque[ErrorRecord] = deque(maxlen=50)
        self.cpu = Gauge()
        self.rss = Gauge()
        self.loop_lag = Gauge()
        self.system_cpu = Gauge()
        self.system_memory = Gauge()
        self.notifier_last_run = 0.0
        self.notifier_last_duration = 0.0
        self._process = psutil.Process(os.getpid())
        self._task: asyncio.Task[None] | None = None

    def update(self, kind: str, ms: float) -> None:
        self.updates.record(ms)
        timeline = self.update_kinds.get(kind)
        if timeline is None:
            timeline = self.update_kinds[kind] = Timeline()
        timeline.record()

    def error(self, source: str, kind: str, message: str) -> None:
        self.errors.record()
        self.recent_errors.appendleft(ErrorRecord(time.time(), source, kind, message[:400]))

    def start(self) -> None:
        if self._task is None:
            self._process.cpu_percent(None)
            psutil.cpu_percent(None)
            self._task = asyncio.create_task(self._sample(), name="metrics")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _sample(self) -> None:
        loop = asyncio.get_running_loop()
        while True:
            expected = loop.time() + SAMPLE_INTERVAL
            await asyncio.sleep(SAMPLE_INTERVAL)
            lag = max(0.0, (loop.time() - expected) * 1000)
            self.loop_lag.set(lag)
            with self._process.oneshot():
                self.cpu.set(self._process.cpu_percent(None))
                self.rss.set(self._process.memory_info().rss / 1048576)
            self.system_cpu.set(psutil.cpu_percent(None))
            self.system_memory.set(psutil.virtual_memory().percent)

    def process(self) -> dict[str, Any]:
        with self._process.oneshot():
            memory = self._process.memory_info()
            threads = self._process.num_threads()
            try:
                fds = self._process.num_fds()
            except AttributeError:
                fds = None
        return {
            "pid": self._process.pid,
            "uptime": int(time.time() - self.started),
            "cpu": round(self.cpu.last, 1),
            "rss_mb": round(memory.rss / 1048576, 1),
            "threads": threads,
            "fds": fds,
            "loop_lag_ms": round(self.loop_lag.last, 1),
            "loop_lag_peak_ms": round(self.loop_lag.peak(60), 1),
            "tasks": len(asyncio.all_tasks()),
        }

    @staticmethod
    def system() -> dict[str, Any]:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        try:
            load = [round(value, 2) for value in os.getloadavg()]
        except (AttributeError, OSError):
            load = None
        return {
            "cpu": psutil.cpu_percent(None),
            "cores": psutil.cpu_count() or 1,
            "load": load,
            "memory_used_mb": round((memory.total - memory.available) / 1048576),
            "memory_total_mb": round(memory.total / 1048576),
            "disk_used_gb": round(disk.used / 1073741824, 1),
            "disk_total_gb": round(disk.total / 1073741824, 1),
            "boot_time": int(psutil.boot_time()),
        }


class MetricsLogHandler(logging.Handler):
    def __init__(self, sink: Metrics) -> None:
        super().__init__(level=logging.WARNING)
        self._sink = sink

    def emit(self, record: logging.LogRecord) -> None:
        try:
            if record.levelno >= logging.ERROR:
                kind = record.exc_info[0].__name__ if record.exc_info and record.exc_info[0] else record.levelname
                message = record.getMessage()
                if record.exc_info and record.exc_info[1] is not None:
                    message = f"{message}: {record.exc_info[1]}"
                self._sink.error(record.name, kind, message)
            else:
                self._sink.warnings.record()
        except Exception:
            self.handleError(record)


metrics = Metrics()
