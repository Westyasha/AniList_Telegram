import time
from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update
from aiogram.types import User as TgUser

from app.bot.context import Ctx
from app.container import Container
from app.i18n import i18n
from app.services.metrics import metrics


class MetricsMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        started = time.perf_counter()
        try:
            return await handler(event, data)
        finally:
            kind = (event.event_type if isinstance(event, Update) else None) or "other"
            metrics.update(kind, (time.perf_counter() - started) * 1000)


class ContextMiddleware(BaseMiddleware):
    def __init__(self, app: Container) -> None:
        self.app = app

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        tg_user: TgUser | None = data.get("event_from_user")
        if tg_user is None or tg_user.is_bot:
            return await handler(event, data)
        self.app.activity.touch(tg_user.id, "bot")
        user = await self.app.users.get_or_create(tg_user.id, tg_user.language_code)
        if user.token and user.token_expires_at and user.token_expires_at < time.time():
            await self.app.users.clear_auth(user.user_id)
            user.token = None
            user.anilist_id = None
        data["ctx"] = Ctx(
            bot=data["bot"],
            app=self.app,
            user=user,
            _=i18n.get(user.lang),
            state=data.get("state"),
        )
        return await handler(event, data)
