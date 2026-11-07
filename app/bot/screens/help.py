from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.ui import Kb, btn

PAGES = ("search", "list", "notify", "inline", "app")


@routes("/help", group="help")
async def help_screen(ctx: Ctx) -> Screen:
    _ = ctx._
    kb = Kb().grid([btn(_(f"help.{page}_button"), f"/help/{page}") for page in PAGES], 2)
    return Screen(_("help.main", bot=ctx.app.bot_username), kb.nav(ctx).build())


@routes("/help/{page}", group="helpp")
async def help_page(ctx: Ctx, page: str) -> Screen:
    _ = ctx._
    key = page if page in PAGES else "search"
    return Screen(_(f"help.{key}", bot=ctx.app.bot_username), Kb().nav(ctx).build())
