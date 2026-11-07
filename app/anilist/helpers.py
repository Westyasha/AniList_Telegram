import re
from datetime import UTC, datetime
from typing import Any

SEASONS = ("WINTER", "SPRING", "SUMMER", "FALL")
LIST_STATUSES = ("CURRENT", "PLANNING", "COMPLETED", "REPEATING", "PAUSED", "DROPPED")
SCORE_FORMATS = ("POINT_100", "POINT_10_DECIMAL", "POINT_10", "POINT_5", "POINT_3")

_TAG_RE = re.compile(r"<[^>]+>")
_SPOILER_RE = re.compile(r"~!.*?!~", re.S)
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MULTI_NL_RE = re.compile(r"\n{3,}")


def title(media: dict[str, Any] | None, prefer: str = "english") -> str:
    if not media:
        return "?"
    names = media.get("title") or {}
    if prefer == "user" and names.get("userPreferred"):
        return names["userPreferred"]
    if prefer == "romaji":
        return names.get("romaji") or names.get("english") or names.get("native") or "?"
    return names.get("english") or names.get("romaji") or names.get("native") or "?"


def name(person: dict[str, Any] | None) -> str:
    if not person:
        return "?"
    names = person.get("name") or {}
    return names.get("userPreferred") or names.get("full") or names.get("native") or "?"


def cover(media: dict[str, Any] | None, size: str = "extraLarge") -> str | None:
    images = (media or {}).get("coverImage") or {}
    return images.get(size) or images.get("extraLarge") or images.get("large") or images.get("medium")


def image(entity: dict[str, Any] | None) -> str | None:
    images = (entity or {}).get("image") or {}
    return images.get("large") or images.get("medium")


def hero_image(media: dict[str, Any] | None) -> str | None:
    return (media or {}).get("bannerImage") or cover(media)


def clean_text(text: str | None, limit: int = 0) -> str:
    if not text:
        return ""
    text = text.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    text = _SPOILER_RE.sub("", text)
    text = _TAG_RE.sub("", text)
    text = _MD_LINK_RE.sub(r"\1", text)
    text = text.replace("__", "").replace("&quot;", '"').replace("&amp;", "&").replace("&#039;", "'")
    text = _MULTI_NL_RE.sub("\n\n", text).strip()
    if limit and len(text) > limit:
        cut = text[:limit].rsplit(" ", 1)[0].rstrip(",.;:—- ")
        text = f"{cut}…"
    return text


def current_season(now: datetime | None = None) -> tuple[str, int]:
    now = now or datetime.now(UTC)
    month, year = now.month, now.year
    if month == 12:
        return "WINTER", year + 1
    if month <= 2:
        return "WINTER", year
    if month <= 5:
        return "SPRING", year
    if month <= 8:
        return "SUMMER", year
    return "FALL", year


def shift_season(season: str, year: int, step: int) -> tuple[str, int]:
    index = SEASONS.index(season) + step
    return SEASONS[index % 4], year + index // 4


def fuzzy_date_int(dt: datetime) -> int:
    return dt.year * 10000 + dt.month * 100 + dt.day


def format_fuzzy_date(value: dict[str, Any] | None) -> str:
    if not value or not value.get("year"):
        return ""
    year, month, day = value.get("year"), value.get("month"), value.get("day")
    if month and day:
        return f"{day:02d}.{month:02d}.{year}"
    if month:
        return f"{month:02d}.{year}"
    return str(year)


def total_units(media: dict[str, Any]) -> int | None:
    return media.get("episodes") if media.get("type") == "ANIME" else media.get("chapters")


def score_from_raw(raw: int | float | None, fmt: str) -> str:
    if not raw:
        return ""
    raw = float(raw)
    if fmt == "POINT_10_DECIMAL":
        return f"{raw / 10:.1f}"
    if fmt == "POINT_10":
        return str(round(raw / 10))
    if fmt == "POINT_5":
        return "★" * max(1, round(raw / 20))
    if fmt == "POINT_3":
        return "🙁" if raw <= 35 else "😐" if raw <= 60 else "🙂"
    return str(round(raw))


def score_choices(fmt: str) -> list[tuple[str, int]]:
    if fmt == "POINT_5":
        return [("★" * n, n * 20) for n in range(5, 0, -1)]
    if fmt == "POINT_3":
        return [("🙂", 85), ("😐", 60), ("🙁", 35)]
    if fmt == "POINT_100":
        return [(str(v), v) for v in range(100, 0, -10)]
    return [(str(v), v * 10) for v in range(10, 0, -1)]


def countdown(seconds: int | None) -> tuple[int, int, int]:
    seconds = max(0, int(seconds or 0))
    return seconds // 86400, seconds % 86400 // 3600, seconds % 3600 // 60
