import logging
from contextlib import suppress

from aiogram import Router
from aiogram.exceptions import TelegramAPIError, TelegramForbiddenError
from aiogram.types import ErrorEvent

from app.anilist.client import AniListError, RateLimitedError
from app.bot import navigation as nav
from app.bot.context import AuthRequiredError, Ctx
from app.i18n import i18n

router = Router(name="errors")
log = logging.getLogger(__name__)


def _message_key(exc: Exception) -> str:
    if isinstance(exc, AuthRequiredError):
        return "errors.auth_required"
    if isinstance(exc, RateLimitedError):
        return "errors.rate_limited"
    if isinstance(exc, AniListError):
        return "errors.not_found" if exc.not_found else "errors.anilist"
    return "errors.unknown"


@router.error()
async def on_error(event: ErrorEvent, ctx: Ctx | None = None) -> bool:
    exc = event.exception
    update = event.update
    if isinstance(exc, TelegramForbiddenError):
        return True
    if not isinstance(exc, (AuthRequiredError, AniListError)):
        log.exception("Unhandled error in update %s", update.update_id, exc_info=exc)
    lang = ctx.lang if ctx else "en"
    text = i18n.get(lang)(_message_key(exc))
    with suppress(TelegramAPIError):
        if update.callback_query is not None:
            await update.callback_query.answer(text, show_alert=True)
            if isinstance(exc, AuthRequiredError) and ctx is not None:
                target = nav.Target.of(update.callback_query)
                if target is not None:
                    await nav.open_at(ctx, target, "/auth")
        elif update.message is not None:
            await update.message.answer(text)
    return True
