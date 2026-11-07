import time
from typing import Any

from app.container import Container
from app.services.metrics import Metrics, metrics

RANGES = {"1h": (60, 1), "6h": (360, 5), "24h": (1440, 15)}


def _hit_rate(source: Metrics, minutes: int) -> float | None:
    calls = source.anilist_calls.summary(minutes)["count"]
    network = source.anilist.summary(minutes)["count"]
    if not calls:
        return None
    return round(max(0.0, 1 - network / calls) * 100, 1)


def load(source: Metrics = metrics) -> dict[str, Any]:
    windows = {"5m": 5, "1h": 60, "24h": 1440}
    kinds = {kind: timeline.summary(1440)["count"] for kind, timeline in source.update_kinds.items()}
    return {
        "updates": {name: source.updates.summary(minutes) for name, minutes in windows.items()},
        "update_kinds": dict(sorted(kinds.items(), key=lambda item: -item[1])),
        "api": {name: source.api.summary(minutes) for name, minutes in windows.items()},
        "anilist": {name: source.anilist.summary(minutes) for name, minutes in windows.items()},
        "anilist_limited_24h": source.anilist_limited.summary(1440)["count"],
        "cache_hit": {name: _hit_rate(source, minutes) for name, minutes in windows.items()},
        "renders": source.renders.summary(1440),
        "notifications": {
            "1h": source.notifications.summary(60)["count"],
            "24h": source.notifications.summary(1440)["count"],
        },
        "notifier": {
            "last_run": int(source.notifier_last_run) or None,
            "duration": round(source.notifier_last_duration, 2),
        },
        "errors": {"1h": source.errors.summary(60)["count"], "24h": source.errors.summary(1440)["count"]},
        "warnings": {"1h": source.warnings.summary(60)["count"], "24h": source.warnings.summary(1440)["count"]},
    }


async def overview(app: Container) -> dict[str, Any]:
    return {
        "now": int(time.time()),
        "users": await app.admin.overview(),
        "online": app.activity.online(),
        "load": load(),
        "anilist": app.anilist.stats(),
        "process": metrics.process(),
        "system": metrics.system(),
        "database": await app.admin.database(),
    }


def series(range_name: str, source: Metrics = metrics) -> dict[str, Any]:
    minutes, step = RANGES.get(range_name, RANGES["1h"])
    return {
        "range": range_name if range_name in RANGES else "1h",
        "step": step * 60,
        "updates": source.updates.series(minutes, step),
        "api": source.api.series(minutes, step),
        "anilist": source.anilist.series(minutes, step),
        "renders": source.renders.series(minutes, step),
        "errors": source.errors.series(minutes, step),
        "cpu": source.cpu.series(minutes, step),
        "rss": source.rss.series(minutes, step),
        "loop_lag": source.loop_lag.series(minutes, step),
        "system_cpu": source.system_cpu.series(minutes, step),
        "system_memory": source.system_memory.series(minutes, step),
    }


def errors(source: Metrics = metrics) -> list[dict[str, Any]]:
    return [
        {"at": int(record.at), "source": record.source, "kind": record.kind, "message": record.message}
        for record in source.recent_errors
    ]
