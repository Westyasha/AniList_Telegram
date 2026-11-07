from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo

from app.bot.context import Ctx
from app.i18n import LANGUAGES, i18n

MENU_ROUTES = {
    "search": "/search",
    "list": "/l/A",
    "trending": "/tr/A/1",
    "schedule": "/sch/0",
    "season": "/se/now/1",
    "profile": "/me",
    "settings": "/set",
}


def menu_lookup() -> dict[str, str]:
    lookup: dict[str, str] = {}
    for lang in LANGUAGES:
        translator = i18n.get(lang)
        for key in [*MENU_ROUTES, "app"]:
            lookup[translator(f"menu.{key}")] = key
    return lookup


MENU_LOOKUP = menu_lookup()


def main_menu(ctx: Ctx) -> ReplyKeyboardMarkup:
    rows: list[list[KeyboardButton]] = []
    app_url = ctx.app.settings.webapp_url
    for row in ctx.user.keyboard_layout:
        buttons = []
        for key in row:
            text = ctx._(f"menu.{key}")
            if key == "app":
                if app_url:
                    buttons.append(KeyboardButton(text=text, web_app=WebAppInfo(url=app_url)))
                continue
            buttons.append(KeyboardButton(text=text))
        if buttons:
            rows.append(buttons)
    return ReplyKeyboardMarkup(
        keyboard=rows,
        resize_keyboard=True,
        is_persistent=True,
        input_field_placeholder=ctx._("menu.placeholder"),
    )
