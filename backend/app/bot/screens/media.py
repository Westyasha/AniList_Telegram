from typing import Any

from app.anilist import helpers
from app.anilist import queries as q
from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.states import Input
from app.bot.ui import Kb, app_btn, b, btn, clip, h, i, link, number, quote, share_btn, url_btn, webapp_url
from app.bot.views import (
    duration,
    media_button_label,
    media_format,
    media_status,
    season_label,
    status_label,
    user_score,
)

TRAILER_SITES = {"youtube": "https://youtu.be/{id}", "dailymotion": "https://www.dailymotion.com/video/{id}"}
STREAMING_TYPES = {"STREAMING"}


async def load_media(ctx: Ctx, media_id: int) -> dict[str, Any]:
    data = await ctx.gql(q.MEDIA, {"id": media_id}, personal=True, ttl=0 if ctx.user.authorized else 300)
    return data.get("Media") or {}


def _info_lines(ctx: Ctx, media: dict[str, Any]) -> list[str]:
    _ = ctx._
    lines: list[str] = []
    score = media.get("averageScore") or media.get("meanScore")
    ranks = [r for r in media.get("rankings") or [] if r.get("allTime") and r.get("type") == "RATED"]
    head = [f"★ {b(f'{score}%')}" if score else "★ —"]
    if ranks:
        head.append(_("media.rank", n=ranks[0]["rank"]))
    head.append(f"❤ {number(media.get('favourites'))}")
    head.append(f"👥 {number(media.get('popularity'))}")
    lines.append(" · ".join(head))

    units = []
    if media.get("episodes"):
        ep = _("media.eps", n=media["episodes"])
        if media.get("duration"):
            ep += f" × {_('media.minutes', n=media['duration'])}"
        units.append(ep)
    if media.get("chapters"):
        units.append(_("media.chs", n=media["chapters"]))
    if media.get("volumes"):
        units.append(_("media.vols", n=media["volumes"]))
    first = [media_format(ctx, media.get("format")), *units, media_status(ctx, media.get("status"))]
    lines.append("📺 " + " · ".join(h(p) for p in first if p))

    when = []
    if media.get("season"):
        when.append(season_label(ctx, media.get("season"), media.get("seasonYear")))
    else:
        start = helpers.format_fuzzy_date(media.get("startDate"))
        if start:
            when.append(start)
    studios = [e["node"]["name"] for e in (media.get("studios") or {}).get("edges") or [] if e.get("isMain")]
    if studios:
        when.append(", ".join(studios[:2]))
    if media.get("source"):
        key = f"source.{media['source'].lower()}"
        when.append(_(key) if _.has(key) else media["source"].replace("_", " ").title())
    if when:
        lines.append("🗓 " + " · ".join(h(p) for p in when))

    genres = media.get("genres") or []
    if genres:
        lines.append("🏷 " + h(", ".join(genres[:6])))
    tags = [t["name"] for t in media.get("tags") or [] if not t.get("isMediaSpoiler") and (t.get("rank") or 0) >= 60]
    if tags:
        lines.append("🔖 " + i(", ".join(tags[:6])))
    nxt = media.get("nextAiringEpisode")
    if nxt:
        lines.append("⏰ " + _("media.next", ep=b(nxt["episode"]), time=b(duration(ctx, nxt["timeUntilAiring"]))))
    return lines


def _entry_line(ctx: Ctx, media: dict[str, Any]) -> str | None:
    entry = media.get("mediaListEntry")
    if not entry:
        return None
    _ = ctx._
    parts = [b(status_label(ctx, entry.get("status"), media.get("type") or "ANIME"))]
    total = helpers.total_units(media)
    if entry.get("progress") or entry.get("status") in ("CURRENT", "REPEATING"):
        parts.append(_("media.progress", cur=entry.get("progress") or 0, total=total or "?"))
    score = user_score(ctx, entry.get("score"))
    if score:
        parts.append(_("media.your_score", score=b(score)))
    if entry.get("repeat"):
        parts.append(_("media.rewatches", n=entry["repeat"]))
    line = "📋 " + " · ".join(parts)
    if entry.get("notes"):
        line += f"\n📝 {i(clip(entry['notes'], 200))}"
    return line


def media_text(ctx: Ctx, media: dict[str, Any], description_limit: int = 900) -> str:
    title = ctx.title(media)
    names = media.get("title") or {}
    alt = [n for n in (names.get("romaji"), names.get("native")) if n and n != title]
    lines = [
        link(
            title, media.get("siteUrl") or f"https://anilist.co/{(media.get('type') or 'anime').lower()}/{media['id']}"
        )
    ]
    lines[0] = f"<b>{lines[0]}</b>"
    if alt:
        lines.append(i(" · ".join(alt[:2])))
    lines.append("")
    lines += _info_lines(ctx, media)
    entry = _entry_line(ctx, media)
    if entry:
        lines += ["", entry]
    description = helpers.clean_text(media.get("description"), description_limit)
    if description:
        lines += ["", quote(h(description), expandable=True)]
    return "\n".join(lines)


def media_keyboard(ctx: Ctx, media: dict[str, Any]) -> Kb:
    _ = ctx._
    mid = media["id"]
    mtype = media.get("type") or "ANIME"
    entry = media.get("mediaListEntry")
    total = helpers.total_units(media)
    kb = Kb()
    if entry and entry.get("status") in ("CURRENT", "REPEATING", "PAUSED", "PLANNING"):
        progress = entry.get("progress") or 0
        unit = _("media.unit_ep") if mtype == "ANIME" else _("media.unit_ch")
        kb.row(
            btn(f"+1 {unit} · {progress + 1}/{total or '?'}", f"!p:{mid}:1", "success"),
            btn("−1", f"!p:{mid}:-1") if progress > 0 else None,
        )
    status_text = status_label(ctx, entry["status"], mtype) if entry else _("media.add")
    kb.row(
        btn(status_text, f"/m/{mid}/e", None if entry else "primary"),
        btn(_("media.rate"), f"/m/{mid}/sc") if entry else None,
        btn("❤️" if media.get("isFavourite") else "🤍", f"!fv:{'a' if mtype == 'ANIME' else 'm'}:{mid}"),
    )
    kb.row(btn(_("media.characters"), f"/m/{mid}/c/1"), btn(_("media.staff"), f"/m/{mid}/s/1"))
    kb.row(btn(_("media.relations"), f"/m/{mid}/r"), btn(_("media.recs"), f"/m/{mid}/rec"))
    extra = []
    app = webapp_url(ctx, f"media/{mid}")
    if app:
        extra.append(app_btn(_("media.open_app"), app))
    trailer = media.get("trailer") or {}
    template = TRAILER_SITES.get(trailer.get("site") or "")
    if template and trailer.get("id"):
        extra.append(url_btn(_("media.trailer"), template.format(id=trailer["id"])))
    kb.row(*extra)
    streams = [x for x in media.get("externalLinks") or [] if x.get("type") in STREAMING_TYPES][:3]
    if streams:
        kb.row(*[url_btn(s["site"], s["url"]) for s in streams])
    kb.row(share_btn(_("media.share"), f"id:{mid}"))
    return kb.nav(ctx)


@routes("/m/{mid}", group="m")
async def media_screen(ctx: Ctx, mid: str) -> Screen:
    media = await load_media(ctx, int(mid))
    if not media:
        return Screen(ctx._("errors.not_found"), Kb().nav(ctx).build())
    return Screen(media_text(ctx, media), media_keyboard(ctx, media).build(), helpers.hero_image(media))


@routes("/m/{mid}/c/{page}", group="mc")
async def characters_screen(ctx: Ctx, mid: str, page: str) -> Screen:
    _ = ctx._
    data = await ctx.gql(q.MEDIA_CHARACTERS, {"id": int(mid), "page": int(page), "perPage": 10}, ttl=600)
    block = ((data.get("Media") or {}).get("characters")) or {}
    edges = block.get("edges") or []
    info = block.get("pageInfo") or {}
    lines = [_("media.characters_title"), ""]
    kb = Kb()
    for edge in edges:
        node = edge["node"]
        role = (
            _("role.main")
            if edge.get("role") == "MAIN"
            else _("role.supporting")
            if edge.get("role") == "SUPPORTING"
            else _("role.background")
        )
        actors = edge.get("voiceActors") or []
        va = f" · 🎙 {h(helpers.name(actors[0]))}" if actors else ""
        lines.append(f"• {b(helpers.name(node))} — {i(role)}{va}")
        kb.row(btn(clip(helpers.name(node), 40), f"/ch/{node['id']}"))
    if not edges:
        lines.append(_("media.empty"))
    kb.pager(int(page), bool(info.get("hasNextPage")), lambda p: f"/m/{mid}/c/{p}", info.get("lastPage"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


@routes("/m/{mid}/s/{page}", group="ms")
async def staff_screen(ctx: Ctx, mid: str, page: str) -> Screen:
    _ = ctx._
    data = await ctx.gql(q.MEDIA_STAFF, {"id": int(mid), "page": int(page), "perPage": 10}, ttl=600)
    block = ((data.get("Media") or {}).get("staff")) or {}
    edges = block.get("edges") or []
    info = block.get("pageInfo") or {}
    lines = [_("media.staff_title"), ""]
    kb = Kb()
    for edge in edges:
        node = edge["node"]
        lines.append(f"• {b(helpers.name(node))} — {i(edge.get('role') or '')}")
        kb.row(btn(clip(helpers.name(node), 40), f"/st/{node['id']}"))
    if not edges:
        lines.append(_("media.empty"))
    kb.pager(int(page), bool(info.get("hasNextPage")), lambda p: f"/m/{mid}/s/{p}", info.get("lastPage"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


@routes("/m/{mid}/r", group="mr")
async def relations_screen(ctx: Ctx, mid: str) -> Screen:
    _ = ctx._
    media = await load_media(ctx, int(mid))
    edges = (media.get("relations") or {}).get("edges") or []
    order = [
        "PREQUEL",
        "SEQUEL",
        "PARENT",
        "SIDE_STORY",
        "SPIN_OFF",
        "ALTERNATIVE",
        "ADAPTATION",
        "SOURCE",
        "SUMMARY",
        "COMPILATION",
        "CONTAINS",
        "CHARACTER",
        "OTHER",
    ]
    edges.sort(key=lambda e: order.index(e.get("relationType")) if e.get("relationType") in order else 99)
    lines = [_("media.relations_title", title=b(ctx.title(media))), ""]
    kb = Kb()
    for edge in edges[:20]:
        node = edge["node"]
        rel_key = f"relation.{(edge.get('relationType') or 'other').lower()}"
        rel = _(rel_key) if _.has(rel_key) else (edge.get("relationType") or "").title()
        lines.append(f"• {i(rel)}: {h(ctx.title(node))} <i>({h(media_format(ctx, node.get('format')))})</i>")
        kb.row(btn(f"{rel} · {clip(ctx.title(node), 30)}", f"/m/{node['id']}"))
    if not edges:
        lines.append(_("media.empty"))
    return Screen("\n".join(lines), kb.nav(ctx).build(), helpers.hero_image(media))


@routes("/m/{mid}/rec", group="mrec")
async def recommendations_screen(ctx: Ctx, mid: str) -> Screen:
    _ = ctx._
    media = await load_media(ctx, int(mid))
    nodes = [n for n in (media.get("recommendations") or {}).get("nodes") or [] if n.get("mediaRecommendation")]
    lines = [_("media.recs_title", title=b(ctx.title(media))), ""]
    kb = Kb()
    for node in nodes[:12]:
        rec = node["mediaRecommendation"]
        kb.row(btn(media_button_label(ctx, rec, extra=f" · 👍{node.get('rating') or 0}"), f"/m/{rec['id']}"))
    if not nodes:
        lines.append(_("media.empty"))
    return Screen("\n".join(lines), kb.nav(ctx).build(), helpers.hero_image(media))


@routes("/m/{mid}/e", group="medit")
async def editor_screen(ctx: Ctx, mid: str) -> Screen:
    _ = ctx._
    ctx.require_auth()
    data = await ctx.gql(q.MEDIA_BRIEF, {"id": int(mid)}, auth=True)
    media = data.get("Media") or {}
    entry = media.get("mediaListEntry") or {}
    mtype = media.get("type") or "ANIME"
    current = entry.get("status")
    lines = [_("editor.title", title=b(ctx.title(media))), ""]
    if entry:
        total = helpers.total_units(media)
        lines.append(
            _(
                "editor.state",
                status=b(status_label(ctx, current, mtype)),
                cur=entry.get("progress") or 0,
                total=total or "?",
            )
        )
        score = user_score(ctx, entry.get("score"))
        if score:
            lines.append(_("media.your_score", score=b(score)))
    else:
        lines.append(_("editor.not_in_list"))
    kb = Kb()
    buttons = []
    for status in helpers.LIST_STATUSES:
        label = status_label(ctx, status, mtype)
        buttons.append(
            btn(
                f"• {label}" if status == current else label,
                f"!st:{mid}:{status}",
                "primary" if status == current else None,
            )
        )
    kb.grid(buttons, 2)
    if entry:
        kb.row(btn(_("editor.notes"), f"/m/{mid}/nt"), btn(_("media.rate"), f"/m/{mid}/sc"))
        kb.row(btn(_("editor.delete"), f"/m/{mid}/del", "danger"))
    return Screen("\n".join(lines), kb.nav(ctx).build(), helpers.cover(media))


@routes("/m/{mid}/sc", group="msc")
async def score_screen(ctx: Ctx, mid: str) -> Screen:
    _ = ctx._
    ctx.require_auth()
    data = await ctx.gql(q.MEDIA_BRIEF, {"id": int(mid)}, auth=True)
    media = data.get("Media") or {}
    entry = media.get("mediaListEntry") or {}
    current = entry.get("score") or 0
    fmt = ctx.user.score_format
    lines = [_("score.title", title=b(ctx.title(media))), _("score.format", fmt=_(f"score_format.{fmt.lower()}"))]
    if current:
        lines.append(_("media.your_score", score=b(user_score(ctx, current))))
    choices = helpers.score_choices(fmt)
    buttons = [
        btn(f"• {label}" if raw == current else label, f"!sc:{mid}:{raw}", "primary" if raw == current else None)
        for label, raw in choices
    ]
    kb = Kb().grid(buttons, 5 if len(buttons) >= 10 else len(buttons))
    if current:
        kb.row(btn(_("score.clear"), f"!sc:{mid}:0", "danger"))
    return Screen("\n".join(lines), kb.nav(ctx).build(), helpers.cover(media))


@routes("/m/{mid}/nt", group="mnt")
async def notes_screen(ctx: Ctx, mid: str) -> Screen:
    _ = ctx._
    ctx.require_auth()
    data = await ctx.gql(q.MEDIA_BRIEF, {"id": int(mid)}, auth=True)
    media = data.get("Media") or {}
    notes = (media.get("mediaListEntry") or {}).get("notes")
    if ctx.state is not None:
        await ctx.state.set_state(Input.text)
        await ctx.state.update_data(input=f"notes:{mid}", target=ctx.target)
    lines = [_("editor.notes_prompt", title=b(ctx.title(media)))]
    if notes:
        lines += ["", quote(h(notes))]
    kb = Kb()
    if notes:
        kb.row(btn(_("editor.notes_clear"), f"!ntc:{mid}", "danger"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


@routes("/m/{mid}/del", group="mdel")
async def delete_screen(ctx: Ctx, mid: str) -> Screen:
    _ = ctx._
    ctx.require_auth()
    data = await ctx.gql(q.MEDIA_BRIEF, {"id": int(mid)}, auth=True)
    media = data.get("Media") or {}
    kb = Kb().row(btn(_("editor.delete_confirm"), f"!del:{mid}", "danger"))
    return Screen(_("editor.delete_question", title=b(ctx.title(media))), kb.nav(ctx).build())


def _appearances(ctx: Ctx, edges: list[dict[str, Any]], kb: Kb, role_key: str) -> list[str]:
    lines = []
    for edge in edges[:8]:
        node = edge.get("node") or {}
        role = edge.get(role_key) or ""
        role_label = ctx._(f"role.{role.lower()}") if role and ctx._.has(f"role.{role.lower()}") else role
        lines.append(f"• {h(ctx.title(node))}" + (f" — {i(role_label)}" if role_label else ""))
        kb.row(btn(media_button_label(ctx, node), f"/m/{node['id']}"))
    return lines


@routes("/ch/{cid}", group="ch")
async def character_screen(ctx: Ctx, cid: str) -> Screen:
    _ = ctx._
    data = await ctx.gql(q.CHARACTER, {"id": int(cid)}, personal=True, ttl=0 if ctx.user.authorized else 600)
    char = data.get("Character") or {}
    if not char:
        return Screen(_("errors.not_found"), Kb().nav(ctx).build())
    names = char.get("name") or {}
    lines = [f"<b>{link(helpers.name(char), char.get('siteUrl') or '')}</b>"]
    alt = [n for n in [names.get("native"), *(names.get("alternative") or [])] if n]
    if alt:
        lines.append(i(", ".join(alt[:4])))
    lines.append("")
    facts = []
    if char.get("gender"):
        facts.append(h(char["gender"]))
    if char.get("age"):
        facts.append(_("people.age", age=h(char["age"])))
    birthday = helpers.format_fuzzy_date(char.get("dateOfBirth"))
    if birthday:
        facts.append(f"🎂 {h(birthday)}")
    facts.append(f"❤ {number(char.get('favourites'))}")
    lines.append(" · ".join(facts))
    description = helpers.clean_text(char.get("description"), 900)
    if description:
        lines += ["", quote(h(description), expandable=True)]
    kb = Kb()
    edges = ((char.get("media") or {}).get("edges")) or []
    actors = []
    for edge in edges:
        for va in edge.get("voiceActors") or []:
            if va["id"] not in {a["id"] for a in actors}:
                actors.append(va)
    if actors:
        lines += ["", _("people.voiced_by", names=", ".join(h(helpers.name(a)) for a in actors[:3]))]
    if edges:
        lines += ["", b(_("people.appears_in"))]
        lines += _appearances(ctx, edges, kb, "characterRole")
    kb.row(
        btn("❤️" if char.get("isFavourite") else "🤍", f"!fv:c:{cid}"),
        *[btn(f"🎙 {clip(helpers.name(a), 24)}", f"/st/{a['id']}") for a in actors[:2]],
    )
    return Screen("\n".join(lines), kb.nav(ctx).build(), helpers.image(char))


@routes("/st/{sid}", group="st")
async def staff_person_screen(ctx: Ctx, sid: str) -> Screen:
    _ = ctx._
    data = await ctx.gql(q.STAFF, {"id": int(sid)}, personal=True, ttl=0 if ctx.user.authorized else 600)
    person = data.get("Staff") or {}
    if not person:
        return Screen(_("errors.not_found"), Kb().nav(ctx).build())
    names = person.get("name") or {}
    lines = [f"<b>{link(helpers.name(person), person.get('siteUrl') or '')}</b>"]
    if names.get("native"):
        lines.append(i(names["native"]))
    lines.append("")
    facts = []
    if person.get("primaryOccupations"):
        facts.append(h(", ".join(person["primaryOccupations"])))
    if person.get("languageV2"):
        facts.append(h(person["languageV2"]))
    if person.get("age"):
        facts.append(_("people.age", age=person["age"]))
    birthday = helpers.format_fuzzy_date(person.get("dateOfBirth"))
    if birthday:
        facts.append(f"🎂 {h(birthday)}")
    if person.get("homeTown"):
        facts.append(f"📍 {h(person['homeTown'])}")
    facts.append(f"❤ {number(person.get('favourites'))}")
    lines.append(" · ".join(facts))
    description = helpers.clean_text(person.get("description"), 700)
    if description:
        lines += ["", quote(h(description), expandable=True)]
    kb = Kb()
    characters = ((person.get("characters") or {}).get("nodes")) or []
    if characters:
        lines += ["", _("people.voices", names=", ".join(h(helpers.name(c)) for c in characters[:6]))]
    edges = ((person.get("staffMedia") or {}).get("edges")) or []
    if edges:
        lines += ["", b(_("people.works"))]
        lines += _appearances(ctx, edges, kb, "staffRole")
    kb.row(
        btn("❤️" if person.get("isFavourite") else "🤍", f"!fv:s:{sid}"),
        *[btn(clip(helpers.name(c), 24), f"/ch/{c['id']}") for c in characters[:2]],
    )
    return Screen("\n".join(lines), kb.nav(ctx).build(), helpers.image(person))
