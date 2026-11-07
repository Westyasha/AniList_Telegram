import logging
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from aiogram.exceptions import TelegramBadRequest
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardMarkup,
    LinkPreviewOptions,
    Message,
)

from app.bot.context import Ctx

log = logging.getLogger(__name__)

TEXT_LIMIT = 4096
HOME = "/home"
BACK = "<"
NOOP = "."


@dataclass(slots=True)
class Screen:
    text: str
    markup: InlineKeyboardMarkup | None = None
    image: str | None = None

    def preview(self) -> LinkPreviewOptions:
        if not self.image:
            return LinkPreviewOptions(is_disabled=True)
        return LinkPreviewOptions(url=self.image, prefer_large_media=True, show_above_text=True)

    def clipped(self) -> str:
        if len(self.text) <= TEXT_LIMIT:
            return self.text
        return self.text[: TEXT_LIMIT - 1] + "…"


ScreenBuilder = Callable[..., Awaitable[Screen]]


@dataclass(frozen=True, slots=True)
class Route:
    regex: re.Pattern[str]
    builder: ScreenBuilder
    group: str


class Routes:
    def __init__(self) -> None:
        self._routes: list[Route] = []

    def __call__(self, pattern: str, *, group: str | None = None) -> Callable[[ScreenBuilder], ScreenBuilder]:
        regex = re.compile("^" + re.sub(r"\{(\w+)\}", r"(?P<\1>[^/]+)", pattern) + "$")

        def decorator(builder: ScreenBuilder) -> ScreenBuilder:
            self._routes.append(Route(regex, builder, group or pattern))
            return builder

        return decorator

    def resolve(self, path: str) -> tuple[Route, dict[str, str]] | None:
        for route in self._routes:
            match = route.regex.match(path)
            if match:
                return route, match.groupdict()
        return None


routes = Routes()


@dataclass(frozen=True, slots=True)
class Target:
    chat_id: int | None = None
    message_id: int | None = None
    inline_message_id: str | None = None

    @property
    def key(self) -> str:
        if self.inline_message_id:
            return f"i:{self.inline_message_id}"
        return f"{self.chat_id}:{self.message_id}"

    @classmethod
    def parse(cls, key: str) -> "Target":
        if key.startswith("i:"):
            return cls(inline_message_id=key[2:])
        chat, message = key.split(":", 1)
        return cls(chat_id=int(chat), message_id=int(message))

    @classmethod
    def of(cls, cb: CallbackQuery) -> "Target | None":
        if cb.inline_message_id:
            return cls(inline_message_id=cb.inline_message_id)
        if isinstance(cb.message, Message):
            return cls(chat_id=cb.message.chat.id, message_id=cb.message.message_id)
        return None


async def build(ctx: Ctx, path: str) -> Screen:
    resolved = routes.resolve(path)
    if resolved is None:
        resolved = routes.resolve(HOME)
        assert resolved is not None
    route, params = resolved
    return await route.builder(ctx, **params)


def group_of(path: str) -> str | None:
    resolved = routes.resolve(path)
    return resolved[0].group if resolved else None


def _next_stack(stack: list[str], path: str) -> list[str]:
    if path == HOME:
        return [HOME]
    if not stack:
        return [path]
    if stack[-1] == path:
        return stack
    if path in stack:
        return stack[: stack.index(path) + 1]
    if group_of(stack[-1]) == group_of(path):
        return [*stack[:-1], path]
    return [*stack, path]


async def edit(ctx: Ctx, target: Target, screen: Screen) -> bool:
    kwargs: dict[str, Any] = {
        "text": screen.clipped(),
        "reply_markup": screen.markup,
        "link_preview_options": screen.preview(),
    }
    try:
        if target.inline_message_id:
            await ctx.bot.edit_message_text(inline_message_id=target.inline_message_id, **kwargs)
        else:
            await ctx.bot.edit_message_text(chat_id=target.chat_id, message_id=target.message_id, **kwargs)
        return True
    except TelegramBadRequest as exc:
        if "message is not modified" in exc.message:
            return True
        log.debug("Edit failed for %s: %s", target.key, exc.message)
        return False


async def send(ctx: Ctx, chat_id: int, path: str, screen: Screen | None = None) -> Message:
    ctx.depth = 1
    screen = screen or await build(ctx, path)
    message = await ctx.bot.send_message(
        chat_id,
        screen.clipped(),
        reply_markup=screen.markup,
        link_preview_options=screen.preview(),
    )
    await ctx.app.nav.set(Target(chat_id, message.message_id).key, [path])
    return message


async def open_at(ctx: Ctx, target: Target, path: str, *, stack: list[str] | None = None) -> bool:
    current = stack if stack is not None else await ctx.app.nav.get(target.key)
    new_stack = _next_stack(current, path)
    ctx.depth = len(new_stack)
    ctx.target = target.key
    screen = await build(ctx, path)
    if await edit(ctx, target, screen):
        await ctx.app.nav.set(target.key, new_stack)
        return True
    if target.chat_id is not None:
        await send(ctx, target.chat_id, path, screen)
        return True
    return False


async def go(ctx: Ctx, cb: CallbackQuery, path: str) -> None:
    target = Target.of(cb)
    if target is None:
        return
    message = cb.message if isinstance(cb.message, Message) else None
    if message is not None and message.text is None:
        await send(ctx, message.chat.id, path)
        return
    await open_at(ctx, target, path)


async def back(ctx: Ctx, cb: CallbackQuery) -> None:
    target = Target.of(cb)
    if target is None:
        return
    stack = await ctx.app.nav.get(target.key)
    if len(stack) <= 1:
        await open_at(ctx, target, HOME, stack=[])
        return
    stack = stack[:-1]
    await open_at(ctx, target, stack[-1], stack=stack[:-1])


async def refresh(ctx: Ctx, cb: CallbackQuery, fallback: str = HOME) -> None:
    target = Target.of(cb)
    if target is None:
        return
    stack = await ctx.app.nav.get(target.key)
    path = stack[-1] if stack else fallback
    await open_at(ctx, target, path, stack=stack[:-1] if stack else [])


async def current_path(ctx: Ctx, target: Target) -> str | None:
    stack = await ctx.app.nav.get(target.key)
    return stack[-1] if stack else None
