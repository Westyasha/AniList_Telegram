from datetime import UTC, datetime

from app.anilist import helpers


def test_score_formats() -> None:
    assert helpers.score_from_raw(85, "POINT_100") == "85"
    assert helpers.score_from_raw(85, "POINT_10_DECIMAL") == "8.5"
    assert helpers.score_from_raw(85, "POINT_10") == "8"
    assert helpers.score_from_raw(80, "POINT_5") == "★★★★"
    assert helpers.score_from_raw(90, "POINT_3") == "\U0001f642"
    assert helpers.score_from_raw(0, "POINT_10") == ""


def test_score_choices_are_raw_100() -> None:
    for fmt in helpers.SCORE_FORMATS:
        assert all(0 < raw <= 100 for _, raw in helpers.score_choices(fmt))


def test_current_season_boundaries() -> None:
    assert helpers.current_season(datetime(2026, 12, 5, tzinfo=UTC)) == ("WINTER", 2027)
    assert helpers.current_season(datetime(2026, 1, 5, tzinfo=UTC)) == ("WINTER", 2026)
    assert helpers.current_season(datetime(2026, 4, 1, tzinfo=UTC)) == ("SPRING", 2026)
    assert helpers.current_season(datetime(2026, 10, 1, tzinfo=UTC)) == ("FALL", 2026)


def test_shift_season() -> None:
    assert helpers.shift_season("FALL", 2026, 1) == ("WINTER", 2027)
    assert helpers.shift_season("WINTER", 2026, -1) == ("FALL", 2025)


def test_clean_text_strips_markup_and_spoilers() -> None:
    raw = "Hello <b>world</b><br>~!secret!~ [link](https://x) &quot;q&quot;"
    assert helpers.clean_text(raw) == 'Hello world\n link "q"'
    assert helpers.clean_text("a b c d e f", 5).endswith("…")


def test_fuzzy_date_int() -> None:
    assert helpers.fuzzy_date_int(datetime(2026, 3, 7, tzinfo=UTC)) == 20260307
