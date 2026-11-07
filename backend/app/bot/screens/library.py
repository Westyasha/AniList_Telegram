from typing import Any

from app.anilist import helpers
from app.anilist import queries as q
from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.ui import Kb, app_btn, b, btn, clip, webapp_url
from app.bot.views import status_label, user_score

TYPES = {"A": "ANIME", "M": "MANGA"}
PER_PAGE = 10


async def load_collection(ctx: Ctx, media_type: str) -> list[dict[str, Any]]:
    data = await ctx.gql(
        q.MEDIA_LIST_COLLECTION,
        {"userId": ctx.user.anilist_id, "type": media_type},
        auth=True,
        ttl=20,
    )
    lists = ((data.get("MediaListCollection") or {}).get("lists")) or []
    seen: set[int] = set()
    entries: list[dict[str, Any]] = []
    for block in lists:
        if block.get("isCustomList"):
            continue
        for entry in block.get("entries") or []:
            if entry["mediaId"] not in seen:
                seen.add(entry["mediaId"])
                entries.append(entry)
    entries.sort(key=lambda e: e.get("updatedAt") or 0, reverse=True)
    return entries


@routes("/l/{kind}", group="l")
async def library_screen(ctx: Ctx, kind: str) -> Screen:
    _ = ctx._
    ctx.require_auth()
    media_type = TYPES.get(kind, "ANIME")
    entries = await load_collection(ctx, media_type)
    counts = dict.fromkeys(helpers.LIST_STATUSES, 0)
    for entry in entries:
        counts[entry["status"]] = counts.get(entry["status"], 0) + 1
    lines = [_("library.title_anime" if media_type == "ANIME" else "library.title_manga"), ""]
    for status in helpers.LIST_STATUSES:
        lines.append(f"{status_label(ctx, status, media_type)}: {b(counts[status])}")
    behind = [
        e
        for e in entries
        if e["status"] in ("CURRENT", "REPEATING")
        and (e["media"].get("nextAiringEpisode") or {}).get("episode")
        and (e.get("progress") or 0) < e["media"]["nextAiringEpisode"]["episode"] - 1
    ]
    if behind:
        lines += ["", _("library.behind", n=b(len(behind)))]
    kb = Kb()
    buttons = [
        btn(f"{status_label(ctx, s, media_type)} · {counts[s]}", f"/l/{kind}/{s[:3]}/1")
        for s in helpers.LIST_STATUSES
        if counts[s]
    ]
    kb.grid(buttons, 2)
    other = "M" if kind == "A" else "A"
    kb.row(btn(_("library.switch_manga" if kind == "A" else "library.switch_anime"), f"/l/{other}"))
    app = webapp_url(ctx, "library")
    if app:
        kb.row(app_btn(_("library.open_app"), app))
    return Screen("\n".join(lines), kb.nav(ctx).build())


STATUS_CODES = {s[:3]: s for s in helpers.LIST_STATUSES}


@routes("/l/{kind}/{code}/{page}", group="lp")
async def library_page(ctx: Ctx, kind: str, code: str, page: str) -> Screen:
    _ = ctx._
    ctx.require_auth()
    media_type = TYPES.get(kind, "ANIME")
    status = STATUS_CODES.get(code, "CURRENT")
    entries = [e for e in await load_collection(ctx, media_type) if e["status"] == status]
    number_page = max(1, int(page))
    start = (number_page - 1) * PER_PAGE
    chunk = entries[start : start + PER_PAGE]
    total_pages = max(1, -(-len(entries) // PER_PAGE))
    lines = [
        f"{b(status_label(ctx, status, media_type))} · {_('library.count', n=len(entries))}",
    ]
    kb = Kb()
    for entry in chunk:
        media = entry["media"]
        total = helpers.total_units(media) or "?"
        score = user_score(ctx, entry.get("score"))
        suffix = f" · {entry.get('progress') or 0}/{total}"
        if score:
            suffix += f" · ★{score}"
        kb.row(btn(f"{clip(ctx.title(media), 30)}{suffix}", f"/m/{media['id']}"))
    if not chunk:
        lines.append(_("library.empty"))
    kb.pager(number_page, start + PER_PAGE < len(entries), lambda p: f"/l/{kind}/{code}/{p}", total_pages)
    image = helpers.hero_image(chunk[0]["media"]) if chunk else None
    return Screen("\n".join(lines), kb.nav(ctx).build(), image)
