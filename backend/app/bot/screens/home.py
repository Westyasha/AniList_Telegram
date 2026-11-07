from app.anilist import helpers
from app.anilist import queries as q
from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.ui import Kb, app_btn, b, btn, h, number, webapp_url
from app.bot.views import duration

HOME_QUERY = """
query HomeHub($userId: Int) {
  User(id: $userId) {
    id name bannerImage
    statistics { anime { count minutesWatched meanScore episodesWatched } manga { count chaptersRead } }
  }
  Viewer { unreadNotificationCount }
  watching: Page(perPage: 50) {
    mediaList(userId: $userId, type: ANIME, status_in: [CURRENT, REPEATING], sort: UPDATED_TIME_DESC) {
      progress
      media { id episodes title { userPreferred romaji english } nextAiringEpisode { episode airingAt timeUntilAiring } }
    }
  }
}
"""

GUEST_BANNER = "https://raw.githubusercontent.com/Westyasha/AniList_Telegram/main/docs/assets/banner.jpg"


def menu_rows(ctx: Ctx, kb: Kb) -> Kb:
    _ = ctx._
    app = webapp_url(ctx)
    if app:
        kb.row(app_btn(_("home.open_app"), app, "primary"))
    kb.row(btn(_("menu.search"), "/search"), btn(_("menu.list"), "/l/A"))
    kb.row(btn(_("menu.trending"), "/tr/A/1"), btn(_("menu.season"), "/se/now/1"))
    kb.row(btn(_("menu.schedule"), "/sch/0"), btn(_("menu.profile"), "/me"))
    kb.row(btn(_("menu.settings"), "/set"), btn(_("menu.help"), "/help"))
    return kb


@routes("/home")
async def home(ctx: Ctx) -> Screen:
    _ = ctx._
    if not ctx.user.authorized:
        text = "\n".join(
            [
                _("home.guest_title"),
                "",
                _("home.guest_body"),
            ]
        )
        kb = Kb()
        kb.row(btn(_("auth.login_button"), "/auth", "success"))
        return Screen(text, menu_rows(ctx, kb).build(), GUEST_BANNER)

    data = await ctx.gql(HOME_QUERY, {"userId": ctx.user.anilist_id}, auth=True, ttl=30)
    user = data.get("User") or {}
    stats = (user.get("statistics") or {}).get("anime") or {}
    manga = (user.get("statistics") or {}).get("manga") or {}
    unread = (data.get("Viewer") or {}).get("unreadNotificationCount") or 0
    entries = ((data.get("watching") or {}).get("mediaList")) or []
    days = round((stats.get("minutesWatched") or 0) / 1440, 1)

    lines = [
        _("home.hello", name=h(user.get("name") or ctx.user.anilist_name or "")),
        "",
        _(
            "home.stats",
            anime=b(number(stats.get("count"))),
            days=b(days),
            score=b(stats.get("meanScore") or "—"),
            manga=b(number(manga.get("count"))),
        ),
    ]
    airing = [e for e in entries if (e.get("media") or {}).get("nextAiringEpisode")]
    airing.sort(key=lambda e: e["media"]["nextAiringEpisode"]["timeUntilAiring"])
    behind = [
        e
        for e in entries
        if (e.get("media") or {}).get("nextAiringEpisode")
        and (e.get("progress") or 0) < e["media"]["nextAiringEpisode"]["episode"] - 1
    ]
    lines.append(_("home.watching", n=b(len(entries)), behind=b(len(behind))))
    if unread:
        lines.append(_("home.unread", n=b(unread)))
    if airing:
        lines += ["", _("home.next_up")]
        for entry in airing[:5]:
            media = entry["media"]
            nxt = media["nextAiringEpisode"]
            lines.append(
                f"• {h(helpers.title(media, ctx.user.title_pref))} — "
                + _("home.ep_in", ep=nxt["episode"], time=duration(ctx, nxt["timeUntilAiring"]))
            )
    kb = Kb()
    if unread:
        kb.row(btn(_("home.inbox", n=unread), "/inbox"))
    image = user.get("bannerImage") or GUEST_BANNER
    return Screen("\n".join(lines), menu_rows(ctx, kb).build(), image)


@routes("/inbox")
async def inbox(ctx: Ctx) -> Screen:
    _ = ctx._
    data = await ctx.gql(q.NOTIFICATIONS, {"perPage": 15, "reset": True}, auth=True)
    items = (data.get("Page") or {}).get("notifications") or []
    lines = [_("inbox.title"), ""]
    kb = Kb()
    for item in items:
        text = describe_notification(ctx, item)
        if not text:
            continue
        lines.append(f"• {text}")
        media = item.get("media")
        if media and len(kb.rows) < 8:
            kb.row(btn(helpers.title(media, ctx.user.title_pref)[:40], f"/m/{media['id']}"))
    if len(lines) == 2:
        lines.append(_("inbox.empty"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


def describe_notification(ctx: Ctx, item: dict) -> str:
    _ = ctx._
    kind = item.get("type") or ""
    media = item.get("media")
    user = item.get("user") or {}
    who = b(user.get("name") or "?")
    if kind == "AIRING" and media:
        return _("inbox.airing", ep=item.get("episode"), title=b(helpers.title(media, ctx.user.title_pref)))
    if kind == "RELATED_MEDIA_ADDITION" and media:
        return _("inbox.related", title=b(helpers.title(media, ctx.user.title_pref)))
    if kind == "MEDIA_DATA_CHANGE" and media:
        return _("inbox.changed", title=b(helpers.title(media, ctx.user.title_pref)))
    if kind == "FOLLOWING":
        return _("inbox.following", user=who)
    if kind in ("ACTIVITY_LIKE", "ACTIVITY_REPLY_LIKE"):
        return _("inbox.like", user=who)
    if kind in ("ACTIVITY_REPLY", "ACTIVITY_MESSAGE", "ACTIVITY_MENTION"):
        return _("inbox.reply", user=who)
    return ""
