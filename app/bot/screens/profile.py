from datetime import UTC, datetime
from typing import Any

from app.anilist import helpers
from app.anilist import queries as q
from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.ui import Kb, app_btn, b, bar, btn, clip, h, i, link, number, quote, url_btn, webapp_url
from app.bot.views import status_label

STATUS_ORDER = ["CURRENT", "COMPLETED", "PLANNING", "PAUSED", "DROPPED", "REPEATING"]


async def load_user(ctx: Ctx, name: str | None = None) -> dict[str, Any]:
    variables: dict[str, Any] = {"name": name} if name else {"id": ctx.user.anilist_id}
    data = await ctx.gql(q.USER_PROFILE, variables, personal=True, ttl=60)
    return data.get("User") or {}


def _profile_text(ctx: Ctx, user: dict[str, Any]) -> str:
    _ = ctx._
    stats = user.get("statistics") or {}
    anime = stats.get("anime") or {}
    manga = stats.get("manga") or {}
    minutes = anime.get("minutesWatched") or 0
    lines = [f"👤 <b>{link(user['name'], user.get('siteUrl') or '')}</b>"]
    about = helpers.clean_text(user.get("about"), 220)
    if about:
        lines.append(i(about))
    lines += [
        "",
        b(_("profile.anime")),
        _(
            "profile.anime_stats",
            count=b(number(anime.get("count"))),
            eps=b(number(anime.get("episodesWatched"))),
            days=b(minutes // 1440),
            hours=b(minutes % 1440 // 60),
            score=b(anime.get("meanScore") or "—"),
        ),
        "",
        b(_("profile.manga")),
        _(
            "profile.manga_stats",
            count=b(number(manga.get("count"))),
            chapters=b(number(manga.get("chaptersRead"))),
            volumes=b(number(manga.get("volumesRead"))),
            score=b(manga.get("meanScore") or "—"),
        ),
    ]
    genres = anime.get("genres") or []
    if genres:
        top = genres[0]["count"] or 1
        lines += ["", b(_("profile.top_genres"))]
        for genre in genres[:5]:
            lines.append(f"<code>{bar(genre['count'], top, 8)}</code> {h(genre['genre'])} · {genre['count']}")
    favourites = user.get("favourites") or {}
    fav_anime = ((favourites.get("anime") or {}).get("nodes")) or []
    fav_chars = ((favourites.get("characters") or {}).get("nodes")) or []
    if fav_anime:
        lines += ["", f"❤️ {b(_('profile.fav_anime'))}: " + ", ".join(h(ctx.title(m)) for m in fav_anime[:5])]
    if fav_chars:
        lines.append(f"💕 {b(_('profile.fav_chars'))}: " + ", ".join(h(helpers.name(c)) for c in fav_chars[:5]))
    created = user.get("createdAt")
    if created:
        lines += ["", i(_("profile.since", date=datetime.fromtimestamp(created, UTC).strftime("%d.%m.%Y")))]
    return "\n".join(lines)


def _profile_keyboard(ctx: Ctx, user: dict[str, Any], own: bool) -> Kb:
    _ = ctx._
    name = user["name"]
    kb = Kb()
    kb.row(btn(_("profile.card"), f"!card:{name}", "primary"), btn(_("profile.stats"), f"/u/{name}/stats"))
    kb.row(btn(_("profile.favourites"), f"/u/{name}/fav"), btn(_("profile.wrapped"), f"/wr/{name}"))
    if own:
        kb.row(btn(_("profile.list"), "/l/A"), btn(_("home.inbox_short"), "/inbox"))
    elif ctx.user.authorized and user.get("id") != ctx.user.anilist_id:
        following = user.get("isFollowing")
        kb.row(
            btn(
                _("profile.unfollow") if following else _("profile.follow"),
                f"!fl:{user['id']}:{name}",
                None if following else "success",
            )
        )
    app = webapp_url(ctx, "me" if own else f"user/{name}")
    kb.row(
        app_btn(_("profile.open_app"), app) if app else None,
        url_btn("AniList ↗", user.get("siteUrl") or f"https://anilist.co/user/{name}"),
    )
    return kb


@routes("/me", group="me")
async def my_profile(ctx: Ctx) -> Screen:
    ctx.require_auth()
    user = await load_user(ctx)
    if not user:
        return Screen(ctx._("errors.not_found"), Kb().nav(ctx).build())
    return Screen(
        _profile_text(ctx, user),
        _profile_keyboard(ctx, user, True).nav(ctx).build(),
        user.get("bannerImage") or (user.get("avatar") or {}).get("large"),
    )


@routes("/u/{name}", group="u")
async def user_profile(ctx: Ctx, name: str) -> Screen:
    user = await load_user(ctx, name)
    if not user:
        return Screen(ctx._("profile.not_found", name=b(name)), Kb().nav(ctx).build())
    own = ctx.user.authorized and user.get("id") == ctx.user.anilist_id
    return Screen(
        _profile_text(ctx, user),
        _profile_keyboard(ctx, user, own).nav(ctx).build(),
        user.get("bannerImage") or (user.get("avatar") or {}).get("large"),
    )


@routes("/u/{name}/stats", group="ust")
async def user_stats(ctx: Ctx, name: str) -> Screen:
    _ = ctx._
    user = await load_user(ctx, name)
    if not user:
        return Screen(_("profile.not_found", name=b(name)), Kb().nav(ctx).build())
    anime = ((user.get("statistics") or {}).get("anime")) or {}
    lines = [_("profile.stats_title", name=b(user["name"])), ""]
    statuses = {s["status"]: s["count"] for s in anime.get("statuses") or []}
    total = sum(statuses.values()) or 1
    lines.append(b(_("profile.by_status")))
    for status in STATUS_ORDER:
        if statuses.get(status):
            lines.append(
                f"<code>{bar(statuses[status], total, 8)}</code> {h(status_label(ctx, status))} · {statuses[status]}"
            )
    scores = sorted(anime.get("scores") or [], key=lambda s: s["score"], reverse=True)
    if scores:
        top = max(s["count"] for s in scores) or 1
        lines += ["", b(_("profile.by_score"))]
        for item in scores[:10]:
            lines.append(f"<code>{item['score']:>3} {bar(item['count'], top, 8)}</code> {item['count']}")
    formats = anime.get("formats") or []
    if formats:
        lines += [
            "",
            b(_("profile.by_format")) + ": " + ", ".join(f"{h(f['format'])} {f['count']}" for f in formats[:6]),
        ]
    years = sorted(anime.get("releaseYears") or [], key=lambda y: y["releaseYear"], reverse=True)
    if years:
        lines += [
            "",
            b(_("profile.by_year")) + ": " + ", ".join(f"{y['releaseYear']} ({y['count']})" for y in years[:8]),
        ]
    studios = anime.get("studios") or []
    if studios:
        lines += ["", b(_("profile.studios")) + ": " + ", ".join(h(s["studio"]["name"]) for s in studios[:5])]
    actors = anime.get("voiceActors") or []
    if actors:
        lines.append(
            b(_("profile.voice_actors")) + ": " + ", ".join(h(helpers.name(a["voiceActor"])) for a in actors[:5])
        )
    return Screen("\n".join(lines), Kb().nav(ctx).build())


@routes("/u/{name}/fav", group="ufav")
async def user_favourites(ctx: Ctx, name: str) -> Screen:
    _ = ctx._
    user = await load_user(ctx, name)
    if not user:
        return Screen(_("profile.not_found", name=b(name)), Kb().nav(ctx).build())
    favourites = user.get("favourites") or {}
    kb = Kb()
    lines = [_("profile.fav_title", name=b(user["name"]))]
    sections = [
        ("profile.fav_anime", (favourites.get("anime") or {}).get("nodes") or [], "m"),
        ("profile.fav_manga", (favourites.get("manga") or {}).get("nodes") or [], "m"),
        ("profile.fav_chars", (favourites.get("characters") or {}).get("nodes") or [], "ch"),
        ("profile.fav_staff", (favourites.get("staff") or {}).get("nodes") or [], "st"),
    ]
    for key, nodes, kind in sections:
        if not nodes:
            continue
        names = [ctx.title(n) if kind == "m" else helpers.name(n) for n in nodes]
        lines += ["", b(_(key)), quote(h(", ".join(names[:25])), expandable=len(names) > 8)]
        kb.grid(
            [btn(clip(label, 20), f"/{kind}/{n['id']}") for label, n in list(zip(names, nodes, strict=False))[:4]], 2
        )
    if len(lines) == 1:
        lines.append(_("profile.no_favourites"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


@routes("/wr/{name}", group="wr")
async def wrapped_picker(ctx: Ctx, name: str) -> Screen:
    _ = ctx._
    year = datetime.now(UTC).year
    years = [year, year - 1, year - 2, year - 3]
    kb = Kb().grid([btn(str(y), f"!wr:{y}:{name}", "primary" if y == year else None) for y in years], 4)
    return Screen(_("wrapped.pick", name=b(name)), kb.nav(ctx).build())
