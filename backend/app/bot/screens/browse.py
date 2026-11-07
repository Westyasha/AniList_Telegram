from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from app.anilist import helpers
from app.anilist import queries as q
from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.ui import Kb, b, btn, clip, h
from app.bot.views import SEASON_ICONS, media_button_label, media_line, season_label

PER_PAGE = 8
SCHEDULE_TZ = {"ru": ZoneInfo("Europe/Moscow"), "en": ZoneInfo("UTC")}


@routes("/tr/{kind}/{page}", group="tr")
async def trending(ctx: Ctx, kind: str, page: str) -> Screen:
    _ = ctx._
    media_type = "MANGA" if kind == "M" else "ANIME"
    number_page = max(1, int(page))
    data = await ctx.gql(q.TRENDING, {"type": media_type, "page": number_page, "perPage": PER_PAGE}, ttl=300)
    block = data.get("Page") or {}
    items = block.get("media") or []
    start = (number_page - 1) * PER_PAGE
    lines = [_("browse.trending_anime" if media_type == "ANIME" else "browse.trending_manga"), ""]
    kb = Kb()
    for index, media in enumerate(items, start=start + 1):
        lines.append(media_line(ctx, index, media))
        kb.row(btn(f"{index}. {media_button_label(ctx, media)}", f"/m/{media['id']}"))
    kb.pager(number_page, bool((block.get("pageInfo") or {}).get("hasNextPage")), lambda p: f"/tr/{kind}/{p}")
    other = "M" if media_type == "ANIME" else "A"
    kb.row(btn(_("browse.to_manga" if media_type == "ANIME" else "browse.to_anime"), f"/tr/{other}/1"))
    image = helpers.hero_image(items[0]) if items else None
    return Screen("\n".join(lines), kb.nav(ctx).build(), image)


def _parse_season(token: str) -> tuple[str, int]:
    if token == "now":
        return helpers.current_season()
    season, _, year = token.partition("-")
    if season in helpers.SEASONS and year.isdigit():
        return season, int(year)
    return helpers.current_season()


@routes("/se/{token}/{page}", group="se")
async def season(ctx: Ctx, token: str, page: str) -> Screen:
    _ = ctx._
    season_name, year = _parse_season(token)
    number_page = max(1, int(page))
    data = await ctx.gql(
        q.SEASON, {"season": season_name, "seasonYear": year, "page": number_page, "perPage": PER_PAGE}, ttl=300
    )
    block = data.get("Page") or {}
    items = block.get("media") or []
    start = (number_page - 1) * PER_PAGE
    lines = [_("browse.season", season=b(season_label(ctx, season_name, year))), ""]
    kb = Kb()
    for index, media in enumerate(items, start=start + 1):
        lines.append(media_line(ctx, index, media))
        kb.row(btn(f"{index}. {media_button_label(ctx, media)}", f"/m/{media['id']}"))
    if not items:
        lines.append(_("browse.empty"))
    kb.pager(
        number_page, bool((block.get("pageInfo") or {}).get("hasNextPage")), lambda p: f"/se/{season_name}-{year}/{p}"
    )
    prev_season, prev_year = helpers.shift_season(season_name, year, -1)
    next_season, next_year = helpers.shift_season(season_name, year, 1)
    kb.row(
        btn(f"‹ {SEASON_ICONS[prev_season]} {prev_year}", f"/se/{prev_season}-{prev_year}/1"),
        btn(f"{SEASON_ICONS[next_season]} {next_year} ›", f"/se/{next_season}-{next_year}/1"),
    )
    image = helpers.hero_image(items[0]) if items else None
    return Screen("\n".join(lines), kb.nav(ctx).build(), image)


def _day_bounds(offset: int, tz: ZoneInfo) -> tuple[datetime, int, int]:
    today = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    day = today + timedelta(days=offset)
    return day, int(day.timestamp()), int((day + timedelta(days=1)).timestamp())


@routes("/sch/{offset}", group="sch")
async def schedule(ctx: Ctx, offset: str) -> Screen:
    return await _schedule(ctx, int(offset), only_mine=False)


@routes("/sch/{offset}/m", group="sch")
async def schedule_mine(ctx: Ctx, offset: str) -> Screen:
    return await _schedule(ctx, int(offset), only_mine=True)


async def _schedule(ctx: Ctx, offset: int, only_mine: bool) -> Screen:
    _ = ctx._
    offset = max(-1, min(6, offset))
    tz = SCHEDULE_TZ.get(ctx.lang, SCHEDULE_TZ["en"])
    day, start, end = _day_bounds(offset, tz)
    items: list[dict] = []
    for page in (1, 2):
        data = await ctx.gql(
            q.SCHEDULE,
            {"from": start - 1, "to": end, "page": page, "perPage": 50},
            personal=True,
            ttl=0 if ctx.user.authorized else 300,
        )
        block = data.get("Page") or {}
        items += [s for s in block.get("airingSchedules") or [] if not s["media"].get("isAdult")]
        if not (block.get("pageInfo") or {}).get("hasNextPage"):
            break
    if only_mine:
        items = [s for s in items if s["media"].get("mediaListEntry")]
    weekday = _(f"weekday.{day.weekday()}")
    title = _("browse.schedule_day", day=b(f"{weekday}, {day:%d.%m}"))
    lines = [title, i_tz(ctx, tz), ""]
    kb = Kb()
    now = datetime.now(UTC).timestamp()
    for item in items[:30]:
        media = item["media"]
        at = datetime.fromtimestamp(item["airingAt"], tz)
        mark = "📋 " if media.get("mediaListEntry") else ""
        aired = "✓" if item["airingAt"] <= now else "·"
        lines.append(
            f"<code>{at:%H:%M}</code> {aired} {mark}{h(clip(ctx.title(media), 40))} — {_('browse.ep', ep=item['episode'])}"
        )
    for item in [s for s in items if s["media"].get("mediaListEntry")][:6]:
        media = item["media"]
        kb.row(btn(f"📋 {clip(ctx.title(media), 34)} · {_('browse.ep', ep=item['episode'])}", f"/m/{media['id']}"))
    if not items:
        lines.append(_("browse.schedule_empty"))
    suffix = "/m" if only_mine else ""
    days = []
    for delta in range(-1, 7):
        d = datetime.now(tz) + timedelta(days=delta)
        label = _(f"weekday_short.{d.weekday()}")
        days.append(btn(f"• {label}" if delta == offset else label, f"/sch/{delta}{suffix}"))
    kb.grid(days, 4)
    if ctx.user.authorized:
        kb.row(
            btn(
                _("browse.schedule_all") if only_mine else _("browse.schedule_mine"),
                f"/sch/{offset}" if only_mine else f"/sch/{offset}/m",
            )
        )
    return Screen("\n".join(lines), kb.nav(ctx).build())


def i_tz(ctx: Ctx, tz: ZoneInfo) -> str:
    return f"<i>{h(ctx._('browse.timezone', tz=str(tz)))}</i>"
