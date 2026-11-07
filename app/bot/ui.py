from html import escape
from typing import Any, Literal

from aiogram.types import (
    CopyTextButton,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    SwitchInlineQueryChosenChat,
    WebAppInfo,
)

from app.bot.context import Ctx
from app.bot.navigation import BACK, HOME, NOOP

Style = Literal["primary", "success", "danger"]


def h(value: Any) -> str:
    return escape(str(value), quote=False) if value is not None else ""


def b(value: Any) -> str:
    return f"<b>{h(value)}</b>"


def i(value: Any) -> str:
    return f"<i>{h(value)}</i>"


def link(text: Any, url: str) -> str:
    return f'<a href="{escape(url, quote=True)}">{h(text)}</a>'


def quote(text: str, expandable: bool = False) -> str:
    tag = "blockquote expandable" if expandable else "blockquote"
    return f"<{tag}>{text}</blockquote>"


def code(value: Any) -> str:
    return f"<code>{h(value)}</code>"


def clip(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def number(value: int | float | None) -> str:
    return f"{int(value or 0):,}".replace(",", " ")


def bar(value: float, total: float, width: int = 10) -> str:
    filled = 0 if total <= 0 else round(min(1.0, value / total) * width)
    return "▰" * filled + "▱" * (width - filled)


def btn(text: str, data: str, style: Style | None = None) -> InlineKeyboardButton:
    if len(data.encode()) > 64:
        raise ValueError(f"callback data too long: {data}")
    if style:
        return InlineKeyboardButton(text=text, callback_data=data, style=style)
    return InlineKeyboardButton(text=text, callback_data=data)


def url_btn(text: str, url: str) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, url=url)


def app_btn(text: str, url: str, style: Style | None = None) -> InlineKeyboardButton:
    if style:
        return InlineKeyboardButton(text=text, web_app=WebAppInfo(url=url), style=style)
    return InlineKeyboardButton(text=text, web_app=WebAppInfo(url=url))


def share_btn(text: str, query: str) -> InlineKeyboardButton:
    return InlineKeyboardButton(
        text=text,
        switch_inline_query_chosen_chat=SwitchInlineQueryChosenChat(
            query=query, allow_user_chats=True, allow_group_chats=True, allow_channel_chats=True
        ),
    )


def copy_btn(text: str, value: str) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, copy_text=CopyTextButton(text=value[:256]))


class Kb:
    def __init__(self) -> None:
        self.rows: list[list[InlineKeyboardButton]] = []

    def row(self, *buttons: InlineKeyboardButton | None) -> "Kb":
        clean = [button for button in buttons if button is not None]
        if clean:
            self.rows.append(clean)
        return self

    def grid(self, buttons: list[InlineKeyboardButton], width: int) -> "Kb":
        for start in range(0, len(buttons), width):
            self.row(*buttons[start : start + width])
        return self

    def pager(self, page: int, has_next: bool, make: Any, total: int | None = None) -> "Kb":
        if page <= 1 and not has_next:
            return self
        label = f"{page}/{total}" if total else str(page)
        self.row(
            btn("‹", make(page - 1)) if page > 1 else btn(" ", NOOP),
            btn(label, NOOP),
            btn("›", make(page + 1)) if has_next else btn(" ", NOOP),
        )
        return self

    def nav(self, ctx: Ctx) -> "Kb":
        if ctx.depth > 1:
            buttons = [btn(ctx._("nav.back"), BACK)]
            if ctx.depth > 2:
                buttons.append(btn(ctx._("nav.home"), HOME))
            self.row(*buttons)
        return self

    def build(self) -> InlineKeyboardMarkup | None:
        return InlineKeyboardMarkup(inline_keyboard=self.rows) if self.rows else None


def webapp_url(ctx: Ctx, route: str = "") -> str | None:
    base = ctx.app.settings.webapp_url
    if not base:
        return None
    return f"{base}#/{route.lstrip('/')}" if route else base
