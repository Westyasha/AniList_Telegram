from app.anilist.oauth import authorize_url
from app.bot.context import Ctx
from app.bot.navigation import Screen, Target, routes
from app.bot.states import Input
from app.bot.ui import Kb, btn, url_btn
from app.security import new_nonce

STATE_TTL = 900


@routes("/auth", group="auth")
async def auth_screen(ctx: Ctx) -> Screen:
    _ = ctx._
    settings = ctx.app.settings
    if ctx.user.authorized:
        kb = Kb().row(btn(_("menu.profile"), "/me"))
        return Screen(_("auth.already", name=ctx.user.anilist_name or "?"), kb.nav(ctx).build())
    kb = Kb()
    if settings.pin_flow or not settings.public_url:
        url = authorize_url(settings.anilist_client_id, settings.anilist_redirect_uri)
        kb.row(url_btn(_("auth.open_anilist"), url))
        if ctx.state is not None:
            await ctx.state.set_state(Input.text)
            await ctx.state.update_data(input="auth", target=ctx.target)
        return Screen(_("auth.pin_instructions"), kb.nav(ctx).build())
    nonce = new_nonce()
    target = Target.parse(ctx.target) if ctx.target and not ctx.target.startswith("i:") else None
    await ctx.app.oauth.create(
        nonce,
        ctx.user.user_id,
        target.chat_id if target else None,
        target.message_id if target else None,
        STATE_TTL,
    )
    kb.row(url_btn(_("auth.open_anilist"), f"{settings.public_url.rstrip('/')}/auth/login?state={nonce}"))
    return Screen(_("auth.instructions"), kb.nav(ctx).build())
