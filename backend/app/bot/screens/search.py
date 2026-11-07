from typing import Any

from app.anilist import helpers
from app.anilist import queries as q
from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.states import Input
from app.bot.ui import Kb, b, btn, clip, h, i, number
from app.bot.views import media_button_label, media_format

KINDS = {"A": "ANIME", "M": "MANGA", "C": "CHARACTER", "P": "STAFF", "U": "USER"}
PER_PAGE = 8

GENRES = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Horror",
    "Mahou Shoujo",
    "Mecha",
    "Music",
    "Mystery",
    "Psychological",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
]
FORMATS = ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "TV_SHORT"]
SCORES = [90, 80, 75, 70, 60]
SORTS = ["POPULARITY_DESC", "SCORE_DESC", "TRENDING_DESC", "START_DATE_DESC"]


@routes("/search")
async def search_menu(ctx: Ctx) -> Screen:
    _ = ctx._
    kb = Kb()
    kb.row(btn(_("search.anime"), "/sq/A"), btn(_("search.manga"), "/sq/M"))
    kb.row(btn(_("search.characters"), "/sq/C"), btn(_("search.staff"), "/sq/P"))
    kb.row(btn(_("search.users"), "/sq/U"), btn(_("search.filter"), "/f", "primary"))
    return Screen(_("search.menu"), kb.nav(ctx).build())


@routes("/sq/{kind}", group="sq")
async def search_prompt(ctx: Ctx, kind: str) -> Screen:
    _ = ctx._
    if ctx.state is not None:
        await ctx.state.set_state(Input.text)
        await ctx.state.update_data(input=f"search:{kind}", target=ctx.target)
    return Screen(_("search.prompt", what=_(f"search.what_{kind}")), Kb().nav(ctx).build())


async def _results_media(ctx: Ctx, kind: str, query: str, page: int) -> tuple[list[str], Kb, bool, Any]:
    data = await ctx.gql(
        q.SEARCH_MEDIA,
        {"search": query, "type": KINDS[kind], "page": page, "perPage": PER_PAGE, "sort": ["SEARCH_MATCH"]},
        personal=True,
        ttl=0 if ctx.user.authorized else 180,
    )
    block = data.get("Page") or {}
    items = block.get("media") or []
    kb = Kb()
    for media in items:
        year = media.get("seasonYear") or (media.get("startDate") or {}).get("year") or ""
        fmt = media_format(ctx, media.get("format"))
        kb.row(btn(media_button_label(ctx, media, extra=f" · {fmt} {year}".rstrip(), limit=30), f"/m/{media['id']}"))
    image = helpers.hero_image(items[0]) if items else None
    return [], kb, bool((block.get("pageInfo") or {}).get("hasNextPage")), image


async def _results_people(ctx: Ctx, kind: str, query: str, page: int) -> tuple[list[str], Kb, bool, Any]:
    document = q.SEARCH_CHARACTERS if kind == "C" else q.SEARCH_STAFF
    data = await ctx.gql(document, {"search": query, "page": page, "perPage": PER_PAGE}, ttl=180)
    block = data.get("Page") or {}
    items = block.get("characters" if kind == "C" else "staff") or []
    kb = Kb()
    lines = []
    for person in items:
        if kind == "C":
            nodes = ((person.get("media") or {}).get("nodes")) or []
            origin = helpers.title(nodes[0]) if nodes else ""
        else:
            origin = ", ".join(person.get("primaryOccupations") or [])
        lines.append(f"• {b(helpers.name(person))}" + (f" — {i(clip(origin, 40))}" if origin else ""))
        route = f"/ch/{person['id']}" if kind == "C" else f"/st/{person['id']}"
        kb.row(btn(f"{clip(helpers.name(person), 32)} · ❤ {number(person.get('favourites'))}", route))
    image = helpers.image(items[0]) if items else None
    return lines, kb, bool((block.get("pageInfo") or {}).get("hasNextPage")), image


async def _results_users(ctx: Ctx, query: str, page: int) -> tuple[list[str], Kb, bool, Any]:
    data = await ctx.gql(q.SEARCH_USERS, {"search": query, "page": page, "perPage": PER_PAGE}, ttl=180)
    block = data.get("Page") or {}
    items = block.get("users") or []
    kb = Kb()
    for user in items:
        kb.row(btn(f"👤 {user['name']}", f"/u/{user['name']}"))
    image = (items[0].get("bannerImage") or (items[0].get("avatar") or {}).get("large")) if items else None
    return [], kb, bool((block.get("pageInfo") or {}).get("hasNextPage")), image


@routes("/s/{kind}/{qid}/{page}", group="s")
async def search_results(ctx: Ctx, kind: str, qid: str, page: str) -> Screen:
    _ = ctx._
    query = await ctx.app.texts.get(qid)
    if not query or kind not in KINDS:
        return Screen(_("search.expired"), Kb().nav(ctx).build())
    number_page = max(1, int(page))
    if kind in ("A", "M"):
        lines, kb, has_next, image = await _results_media(ctx, kind, query, number_page)
    elif kind in ("C", "P"):
        lines, kb, has_next, image = await _results_people(ctx, kind, query, number_page)
    else:
        lines, kb, has_next, image = await _results_users(ctx, query, number_page)
    header = _("search.results", q=b(clip(query, 60)), what=_(f"search.what_{kind}"))
    if not kb.rows:
        return Screen(
            _("search.empty", q=b(clip(query, 60))), Kb().row(btn(_("search.again"), f"/sq/{kind}")).nav(ctx).build()
        )
    kb.pager(number_page, has_next, lambda p: f"/s/{kind}/{qid}/{p}")
    kb.row(btn(_("search.again"), f"/sq/{kind}"))
    return Screen("\n".join([header, "", *lines]).strip(), kb.nav(ctx).build(), image)


async def _filters(ctx: Ctx) -> dict[str, Any]:
    if ctx.state is None:
        return {}
    data = await ctx.state.get_data()
    value = data.get("filter") or {}
    return value if isinstance(value, dict) else {}


def _filter_summary(ctx: Ctx, f: dict[str, Any]) -> list[str]:
    _ = ctx._
    none = i(_("filter.any"))
    genres = ", ".join(f.get("genres") or []) or None
    return [
        f"🏷 {_('filter.genres')}: {h(genres) if genres else none}",
        f"📅 {_('filter.year')}: {h(f['year']) if f.get('year') else none}",
        f"📺 {_('filter.format')}: {h(media_format(ctx, f['format'])) if f.get('format') else none}",
        f"★ {_('filter.score')}: {h(str(f['score']) + '%+') if f.get('score') else none}",
        f"↕ {_('filter.sort')}: {h(_('sort.' + f.get('sort', 'POPULARITY_DESC').lower()))}",
    ]


@routes("/f", group="f")
async def filter_screen(ctx: Ctx) -> Screen:
    _ = ctx._
    f = await _filters(ctx)
    kb = Kb()
    kb.row(btn(_("filter.genres"), "/f/g"), btn(_("filter.year"), "/f/y"))
    kb.row(btn(_("filter.format"), "/f/fm"), btn(_("filter.score"), "/f/sc"))
    kb.row(btn(_("filter.sort"), "/f/so"), btn(_("filter.reset"), "!f:reset", "danger"))
    kb.row(btn(_("filter.go"), "/fr/1", "success"))
    return Screen("\n".join([_("filter.title"), "", *_filter_summary(ctx, f)]), kb.nav(ctx).build())


@routes("/f/g", group="fg")
async def filter_genres(ctx: Ctx) -> Screen:
    f = await _filters(ctx)
    chosen = set(f.get("genres") or [])
    buttons = [btn(f"✓ {g}" if g in chosen else g, f"!f:g:{g}", "primary" if g in chosen else None) for g in GENRES]
    kb = Kb().grid(buttons, 3)
    return Screen(ctx._("filter.pick_genres"), kb.nav(ctx).build())


@routes("/f/y", group="fy")
async def filter_years(ctx: Ctx) -> Screen:
    f = await _filters(ctx)
    year = helpers.current_season()[1]
    years = list(range(year + 1, year - 24, -1))
    buttons = [btn(f"✓ {y}" if f.get("year") == y else str(y), f"!f:y:{y}") for y in years]
    kb = Kb().grid(buttons, 5).row(btn(ctx._("filter.any"), "!f:y:0"))
    return Screen(ctx._("filter.pick_year"), kb.nav(ctx).build())


@routes("/f/fm", group="ffm")
async def filter_formats(ctx: Ctx) -> Screen:
    f = await _filters(ctx)
    buttons = [btn(("✓ " if f.get("format") == x else "") + media_format(ctx, x), f"!f:fm:{x}") for x in FORMATS]
    kb = Kb().grid(buttons, 3).row(btn(ctx._("filter.any"), "!f:fm:0"))
    return Screen(ctx._("filter.pick_format"), kb.nav(ctx).build())


@routes("/f/sc", group="fsc")
async def filter_scores(ctx: Ctx) -> Screen:
    f = await _filters(ctx)
    buttons = [btn(("✓ " if f.get("score") == s else "") + f"{s}%+", f"!f:sc:{s}") for s in SCORES]
    kb = Kb().grid(buttons, 5).row(btn(ctx._("filter.any"), "!f:sc:0"))
    return Screen(ctx._("filter.pick_score"), kb.nav(ctx).build())


@routes("/f/so", group="fso")
async def filter_sorts(ctx: Ctx) -> Screen:
    f = await _filters(ctx)
    current = f.get("sort", "POPULARITY_DESC")
    buttons = [btn(("✓ " if current == s else "") + ctx._("sort." + s.lower()), f"!f:so:{s}") for s in SORTS]
    kb = Kb().grid(buttons, 2)
    return Screen(ctx._("filter.pick_sort"), kb.nav(ctx).build())


def total_label(total: int) -> str:
    return f"{number(total)}+" if total >= 5000 else number(total)


@routes("/fr/{page}", group="fr")
async def filter_results(ctx: Ctx, page: str) -> Screen:
    _ = ctx._
    f = await _filters(ctx)
    number_page = max(1, int(page))
    variables: dict[str, Any] = {
        "type": "ANIME",
        "page": number_page,
        "perPage": PER_PAGE,
        "sort": [f.get("sort", "POPULARITY_DESC")],
    }
    if f.get("genres"):
        variables["genres"] = f["genres"]
    if f.get("year"):
        variables["seasonYear"] = int(f["year"])
    if f.get("format"):
        variables["formats"] = [f["format"]]
    if f.get("score"):
        variables["minScore"] = int(f["score"]) - 1
    data = await ctx.gql(q.SEARCH_MEDIA, variables, personal=True, ttl=0 if ctx.user.authorized else 180)
    block = data.get("Page") or {}
    items = block.get("media") or []
    info = block.get("pageInfo") or {}
    kb = Kb()
    for media in items:
        year = media.get("seasonYear") or (media.get("startDate") or {}).get("year") or ""
        kb.row(btn(media_button_label(ctx, media, extra=f" · {year}" if year else ""), f"/m/{media['id']}"))
    if not items:
        return Screen(_("filter.empty"), Kb().row(btn(_("filter.edit"), "/f")).nav(ctx).build())
    kb.pager(number_page, bool(info.get("hasNextPage")), lambda p: f"/fr/{p}")
    kb.row(btn(_("filter.edit"), "/f"))
    lines = [_("filter.results", n=b(total_label(info.get("total") or len(items)))), "", *_filter_summary(ctx, f)]
    return Screen("\n".join(lines), kb.nav(ctx).build(), helpers.hero_image(items[0]))
