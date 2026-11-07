import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import (
    BotCommand,
    BotCommandScopeAllPrivateChats,
    LinkPreviewOptions,
    MenuButtonWebApp,
    WebAppInfo,
)

from app.bot import screens
from app.bot.handlers import actions, cards, commands, errors, inline, inputs, navigation
from app.bot.middlewares import ContextMiddleware
from app.container import Container
from app.db.fsm import PostgresStorage
from app.i18n import LANGUAGES, i18n

log = logging.getLogger(__name__)

COMMANDS = [
    "start",
    "search",
    "anime",
    "manga",
    "list",
    "schedule",
    "trending",
    "season",
    "user",
    "card",
    "wrapped",
    "app",
    "settings",
    "help",
]


def create_bot(token: str) -> Bot:
    return Bot(
        token=token,
        default=DefaultBotProperties(
            parse_mode=ParseMode.HTML,
            link_preview=LinkPreviewOptions(is_disabled=True),
        ),
    )


def create_dispatcher(container: Container) -> Dispatcher:
    dp = Dispatcher(storage=PostgresStorage(container.db))
    dp.update.outer_middleware(ContextMiddleware(container))
    dp.include_routers(
        errors.router,
        commands.router,
        inputs.router,
        navigation.router,
        actions.router,
        cards.router,
        inline.router,
    )
    log.debug("Registered screens: %s", ", ".join(screens.__all__))
    return dp


async def configure_bot(bot: Bot, container: Container) -> None:
    me = await bot.get_me()
    container.bot_username = me.username or ""
    for lang in LANGUAGES:
        _ = i18n.get(lang)
        commands = [BotCommand(command=c, description=_(f"commands.{c}")) for c in COMMANDS]
        language_code = None if lang == "en" else lang
        await bot.set_my_commands(commands, scope=BotCommandScopeAllPrivateChats(), language_code=language_code)
        await bot.set_my_short_description(_("bot.short_description"), language_code=language_code)
        await bot.set_my_description(_("bot.description"), language_code=language_code)
    if container.settings.webapp_url:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="AniList", web_app=WebAppInfo(url=container.settings.webapp_url))
        )
    log.info("Bot @%s configured", container.bot_username)
