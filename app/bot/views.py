from typing import Any

from app.anilist import helpers
from app.bot.context import Ctx
from app.bot.ui import b, clip, h, number

STATUS_ICONS = {
    "CURRENT": "▶️",
    "PLANNING": "🗓",
    "COMPLETED": "✅",
    "REPEATING": "🔁",
    "PAUSED": "⏸",
    "DROPPED": "⏹",
}

SEASON_ICONS = {"WINTER": "❄️", "SPRING": "🌸", "SUMMER": "☀️", "FALL": "🍁"}


def status_label(ctx: Ctx, status: str | None, media_type: str = "ANIME") -> str:
    if not status:
        return ""
    key = f"status.{status.lower()}"
    if media_type == "MANGA" and status in ("CURRENT", "REPEATING"):
        key = f"{key}_manga"
    return f"{STATUS_ICONS.get(status, '')} {ctx._(key)}".strip()


def media_format(ctx: Ctx, value: str | None) -> str:
    if not value:
        return ""
    key = f"format.{value.lower()}"
    return ctx._(key) if ctx._.has(key) else value.replace("_", " ").title()


def media_status(ctx: Ctx, value: str | None) -> str:
    if not value:
        return ""
    key = f"release.{value.lower()}"
    return ctx._(key) if ctx._.has(key) else value.title()


def season_label(ctx: Ctx, season: str | None, year: int | None = None) -> str:
    if not season:
        return str(year or "")
    return f"{SEASON_ICONS.get(season, '')} {ctx._(f'season.{season.lower()}')} {year or ''}".strip()


def duration(ctx: Ctx, seconds: int | None) -> str:
    days, hours, minutes = helpers.countdown(seconds)
    if days:
        return ctx._("time.dh", d=days, h=hours)
    if hours:
        return ctx._("time.hm", h=hours, m=minutes)
    return ctx._("time.m", m=max(1, minutes))


def score_pct(value: int | None) -> str:
    return f"{value}%" if value else "—"


def user_score(ctx: Ctx, raw: int | float | None) -> str:
    return helpers.score_from_raw(raw, ctx.user.score_format)


def media_button_label(ctx: Ctx, media: dict[str, Any], *, extra: str = "", limit: int = 34) -> str:
    entry = media.get("mediaListEntry") or {}
    mark = STATUS_ICONS.get(entry.get("status") or "", "")
    score = media.get("averageScore")
    tail = f" · {score}%" if score else ""
    prefix = f"{mark} " if mark else ""
    return f"{prefix}{clip(ctx.title(media), limit)}{tail}{extra}"


def media_line(ctx: Ctx, index: int, media: dict[str, Any]) -> str:
    parts = [media_format(ctx, media.get("format"))]
    if media.get("averageScore"):
        parts.append(f"★ {media['averageScore']}%")
    nxt = media.get("nextAiringEpisode")
    if nxt:
        parts.append(ctx._("media.next_short", ep=nxt["episode"], time=duration(ctx, nxt["timeUntilAiring"])))
    elif media.get("episodes"):
        parts.append(ctx._("media.eps", n=media["episodes"]))
    elif media.get("chapters"):
        parts.append(ctx._("media.chs", n=media["chapters"]))
    genres = ", ".join((media.get("genres") or [])[:3])
    meta = " · ".join(p for p in parts if p)
    line = f"{b(f'{index}.')} {h(clip(ctx.title(media), 48))}\n    <i>{h(meta)}</i>"
    if genres:
        line += f"\n    <i>{h(genres)}</i>"
    return line


def people_count(value: int | None) -> str:
    return number(value)
