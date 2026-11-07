from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.ui import Kb, b, btn, h, i
from app.db.models import MENU_BUTTONS, NOTIFICATION_DEFAULTS

NOTIFICATION_ORDER = [key for key in NOTIFICATION_DEFAULTS if key != "enabled"]


@routes("/set", group="set")
async def settings_screen(ctx: Ctx) -> Screen:
    _ = ctx._
    user = ctx.user
    lines = [_("settings.title"), ""]
    lines.append(_("settings.language", lang=b(_("lang.name"))))
    if user.authorized:
        lines.append(_("settings.account", name=b(user.anilist_name or "?")))
        lines.append(_("settings.score_format", fmt=b(_(f"score_format.{user.score_format.lower()}"))))
        lines.append(
            _(
                "settings.notifications",
                state=b(_("common.on") if user.notifications.get("enabled") else _("common.off")),
            )
        )
    else:
        lines.append(_("settings.guest"))
    kb = Kb()
    kb.row(btn(_("settings.lang_button"), "/set/lang"), btn(_("settings.keyboard_button"), "/set/kb"))
    if user.authorized:
        kb.row(btn(_("settings.notifications_button"), "/set/n"), btn(_("settings.cache_button"), "!cache"))
        kb.row(btn(_("settings.logout_button"), "/set/out", "danger"))
    else:
        kb.row(btn(_("auth.login_button"), "/auth", "success"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


@routes("/set/lang", group="setlang")
async def language_screen(ctx: Ctx) -> Screen:
    kb = Kb().row(
        btn("🇷🇺 Русский", "!lang:ru", "primary" if ctx.lang == "ru" else None),
        btn("🇬🇧 English", "!lang:en", "primary" if ctx.lang == "en" else None),
    )
    return Screen(ctx._("settings.pick_language"), kb.nav(ctx).build())


@routes("/set/n", group="setn")
async def notifications_screen(ctx: Ctx) -> Screen:
    _ = ctx._
    ctx.require_auth()
    settings = ctx.user.notifications
    enabled = settings.get("enabled")
    lines = [_("notify.title"), "", _("notify.preview"), "", i(_("notify.hint"))]
    kb = Kb()
    kb.row(btn(("🔔 " if enabled else "🔕 ") + _("notify.master"), "!n:enabled", "success" if enabled else "danger"))
    if enabled:
        for key in NOTIFICATION_ORDER:
            mark = "✅" if settings.get(key) else "▫️"
            kb.row(btn(f"{mark} {_('notify.' + key)}", f"!n:{key}"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


@routes("/set/kb", group="setkb")
async def keyboard_screen(ctx: Ctx) -> Screen:
    _ = ctx._
    active = {key for row in ctx.user.keyboard_layout for key in row}
    buttons = [
        btn(("✅ " if key in active else "▫️ ") + _(f"menu.{key}"), f"!kb:{key}")
        for key in MENU_BUTTONS
        if key != "settings"
    ]
    kb = Kb().grid(buttons, 2).row(btn(_("settings.keyboard_reset"), "!kb:reset", "danger"))
    preview = "\n".join(" | ".join(_(f"menu.{key}") for key in row) for row in ctx.user.keyboard_layout)
    return Screen("\n".join([_("settings.keyboard_title"), "", f"<pre>{h(preview)}</pre>"]), kb.nav(ctx).build())


@routes("/set/out", group="setout")
async def logout_screen(ctx: Ctx) -> Screen:
    kb = Kb().row(btn(ctx._("settings.logout_confirm"), "!logout", "danger"))
    return Screen(ctx._("settings.logout_question", name=b(ctx.user.anilist_name or "?")), kb.nav(ctx).build())
