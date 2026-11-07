from app.config import Settings
from app.services.metrics import Gauge, Metrics, Timeline

NOW = 1_800_000_000.0


def test_timeline_summary_and_percentiles() -> None:
    timeline = Timeline()
    for value in [8] * 90 + [400] * 9 + [12_000]:
        timeline.record(value, now=NOW)
    timeline.record(None, error=True, now=NOW)
    summary = timeline.summary(5, now=NOW)
    assert summary["count"] == 101
    assert summary["errors"] == 1
    assert 5 < summary["p50"] <= 10
    assert 300 < summary["p95"] <= 400
    assert summary["max"] == 12_000


def test_timeline_window_drops_old_minutes() -> None:
    timeline = Timeline()
    timeline.record(10, now=NOW - 3600)
    timeline.record(10, now=NOW)
    assert timeline.summary(5, now=NOW)["count"] == 1
    assert timeline.summary(120, now=NOW)["count"] == 2


def test_series_skips_the_unfinished_minute() -> None:
    timeline = Timeline()
    timeline.record(10, now=NOW)
    timeline.record(10, now=NOW - 60)
    timeline.record(10, now=NOW - 120)
    points = timeline.series(60, 5, now=NOW)
    assert len(points) == 12
    assert points[-1]["count"] == 2
    assert all(point["count"] == 0 for point in points[:-1])
    assert points[1]["t"] - points[0]["t"] == 300


def test_gauge_series_marks_missing_samples() -> None:
    gauge = Gauge()
    gauge.set(10, now=NOW - 60)
    gauge.set(30, now=NOW - 60)
    gauge.set(99, now=NOW)
    points = gauge.series(3, 1, now=NOW)
    assert points[0]["avg"] is None
    assert points[-1] == {"t": points[-1]["t"], "avg": 20.0, "max": 30.0}
    assert gauge.last == 99


def test_error_records_are_bounded_and_newest_first() -> None:
    metrics = Metrics()
    for index in range(60):
        metrics.error("app", "ValueError", f"boom {index}")
    assert len(metrics.recent_errors) == 50
    assert metrics.recent_errors[0].message == "boom 59"


def test_admin_ids_parsing(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_IDS", "701516808, 42;x,")
    assert Settings().admins == frozenset({701516808, 42})
    monkeypatch.setenv("ADMIN_IDS", "")
    assert Settings().admins == frozenset()
