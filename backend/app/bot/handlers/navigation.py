from contextlib import suppress

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery

from app.bot import navigation as nav
from app.bot.context import Ctx

router = Router(name="navigation")


async def answer(cb: CallbackQuery, text: str | None = None, alert: bool = False) -> None:
    with suppress(TelegramBadRequest):
        await cb.answer(text, show_alert=alert)


@router.callback_query(F.data == nav.NOOP)
async def on_noop(cb: CallbackQuery) -> None:
    await answer(cb)


@router.callback_query(F.data == nav.BACK)
async def on_back(cb: CallbackQuery, ctx: Ctx) -> None:
    if ctx.state is not None:
        await ctx.state.set_state(None)
    await nav.back(ctx, cb)
    await answer(cb)


@router.callback_query(F.data.startswith("/"))
async def on_route(cb: CallbackQuery, ctx: Ctx) -> None:
    path = cb.data or nav.HOME
    if ctx.state is not None:
        await ctx.state.set_state(None)
    await nav.go(ctx, cb, path)
    await answer(cb)
