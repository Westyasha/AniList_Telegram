from contextlib import suppress

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import Message

from app.bot import navigation as nav
from app.bot.context import Ctx
from app.bot.handlers.cards import send_profile_card, send_wrapped
from app.bot.menu import MENU_LOOKUP, MENU_ROUTES, main_menu
from app.bot.navigation import Target
from app.bot.ui import Kb, app_btn, webapp_url

router = Router(name="commands")
router.message.filter(F.chat.type == "private")

DEEP_LINKS = {
    "m": "/m/{}",
    "u": "/u/{}",
    "ch": "/ch/{}",
    "st": "/st/{}",
}


async def open_screen(message: Message, ctx: Ctx, path: str) -> None:
    if ctx.state is not None:
        await ctx.state.set_state(None)
    await nav.send(ctx, message.chat.id, path)


async def search_text(message: Message, ctx: Ctx, kind: str, query: str) -> None:
    digest = await ctx.app.texts.put(query.strip()[:200])
    await open_screen(message, ctx, f"/s/{kind}/{digest}/1")


@router.message(CommandStart())
async def cmd_start(message: Message, ctx: Ctx, command: CommandObject) -> None:
    payload = (command.args or "").strip()
    await ctx.app.users.set_blocked(ctx.user.user_id, False)
    if ctx.user.is_new or payload in ("", "start"):
        await message.answer(ctx._("start.keyboard_ready"), reply_markup=main_menu(ctx))
    if payload == "login":
        await open_screen(message, ctx, "/auth")
        return
    prefix, _, value = payload.partition("_")
    template = DEEP_LINKS.get(prefix)
    if template and value:
        await open_screen(message, ctx, template.format(value))
        return
    await open_screen(message, ctx, nav.HOME)


@router.message(Command("menu", "home"))
async def cmd_menu(message: Message, ctx: Ctx) -> None:
    await message.answer(ctx._("start.keyboard_ready"), reply_markup=main_menu(ctx))
    await open_screen(message, ctx, nav.HOME)


@router.message(Command("help"))
async def cmd_help(message: Message, ctx: Ctx) -> None:
    await open_screen(message, ctx, "/help")


@router.message(Command("settings"))
async def cmd_settings(message: Message, ctx: Ctx) -> None:
    await open_screen(message, ctx, "/set")


@router.message(Command("login"))
async def cmd_login(message: Message, ctx: Ctx) -> None:
    await open_screen(message, ctx, "/auth")


@router.message(Command("list"))
async def cmd_list(message: Message, ctx: Ctx) -> None:
    await open_screen(message, ctx, "/l/A")


@router.message(Command("schedule"))
async def cmd_schedule(message: Message, ctx: Ctx) -> None:
    await open_screen(message, ctx, "/sch/0")


@router.message(Command("trending"))
async def cmd_trending(message: Message, ctx: Ctx) -> None:
    await open_screen(message, ctx, "/tr/A/1")


@router.message(Command("season"))
async def cmd_season(message: Message, ctx: Ctx) -> None:
    await open_screen(message, ctx, "/se/now/1")


@router.message(Command("anime", "manga", "character", "staff", "search"))
async def cmd_search(message: Message, ctx: Ctx, command: CommandObject) -> None:
    kinds = {"anime": "A", "search": "A", "manga": "M", "character": "C", "staff": "P"}
    kind = kinds[command.command]
    if command.args:
        await search_text(message, ctx, kind, command.args)
    else:
        await open_screen(message, ctx, f"/sq/{kind}")


@router.message(Command("user", "findprofile", "profile"))
async def cmd_user(message: Message, ctx: Ctx, command: CommandObject) -> None:
    if command.args:
        await open_screen(message, ctx, f"/u/{command.args.strip().split()[0][:40]}")
    elif ctx.user.authorized:
        await open_screen(message, ctx, "/me")
    else:
        await open_screen(message, ctx, "/sq/U")


@router.message(Command("card"))
async def cmd_card(message: Message, ctx: Ctx, command: CommandObject) -> None:
    name = (command.args or "").strip().split()[0][:40] if command.args else ctx.user.anilist_name
    if not name:
        await open_screen(message, ctx, "/auth")
        return
    await send_profile_card(ctx, message.chat.id, name)


@router.message(Command("wrapped"))
async def cmd_wrapped(message: Message, ctx: Ctx, command: CommandObject) -> None:
    if not ctx.user.anilist_name:
        await open_screen(message, ctx, "/auth")
        return
    year = int(command.args) if command.args and command.args.strip().isdigit() else None
    if year:
        await send_wrapped(ctx, message.chat.id, ctx.user.anilist_name, year)
    else:
        await open_screen(message, ctx, f"/wr/{ctx.user.anilist_name}")


@router.message(Command("app"))
async def cmd_app(message: Message, ctx: Ctx) -> None:
    url = webapp_url(ctx)
    if not url:
        await open_screen(message, ctx, nav.HOME)
        return
    kb = Kb().row(app_btn(ctx._("home.open_app"), url, "primary")).build()
    await message.answer(ctx._("app.invite"), reply_markup=kb)


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, ctx: Ctx) -> None:
    if ctx.state is not None:
        await ctx.state.clear()
    await message.answer(ctx._("common.cancelled"), reply_markup=main_menu(ctx))


@router.message(F.text.func(lambda text: text in MENU_LOOKUP))
async def on_menu_button(message: Message, ctx: Ctx) -> None:
    key = MENU_LOOKUP[message.text or ""]
    route = MENU_ROUTES.get(key)
    if key in ("list", "profile") and not ctx.user.authorized:
        route = "/auth"
    if route:
        with suppress(TelegramBadRequest):
            await message.delete()
        await open_screen(message, ctx, route)


async def delete_quietly(message: Message) -> None:
    with suppress(TelegramBadRequest):
        await message.delete()


async def render_into(ctx: Ctx, target_key: str | None, chat_id: int, path: str) -> None:
    if target_key:
        target = Target.parse(target_key)
        if await nav.open_at(ctx, target, path):
            return
    await nav.send(ctx, chat_id, path)
