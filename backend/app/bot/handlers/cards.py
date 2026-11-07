import logging
import time
from contextlib import suppress

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import BufferedInputFile, CallbackQuery, Message
from aiogram.utils.chat_action import ChatActionSender

from app.bot.context import Ctx
from app.bot.handlers.navigation import answer
from app.bot.ui import Kb, b, btn, link, share_btn
from app.services.cards import cards

router = Router(name="cards")
log = logging.getLogger(__name__)

CARD_TTL = 6 * 3600
WRAPPED_TTL = 24 * 3600


def _card_caption(ctx: Ctx, payload: dict) -> str:
    _ = ctx._
    url = f"https://anilist.co/user/{payload['name']}"
    return "\n".join(
        [
            f"🪪 <b>{link(payload['name'], url)}</b>",
            _("card.caption", anime=b(payload["anime_count"]), days=b(payload["days"]), score=b(payload["score"])),
        ]
    )


async def send_profile_card(ctx: Ctx, chat_id: int, name: str) -> Message | None:
    _ = ctx._
    token = ctx.user.token if ctx.user.authorized else None
    user = await cards.fetch_card_user(ctx.app.anilist, name, token)
    if not user:
        await ctx.bot.send_message(chat_id, _("profile.not_found", name=b(name)))
        return None
    payload = cards.card_payload(user)
    key = cards.digest([payload, ctx.lang])
    kind = f"card:{user['id']}"
    kb = (
        Kb()
        .row(btn(_("card.open_profile"), f"/u/{user['name']}"), share_btn(_("card.share"), f"card {user['name']}"))
        .build()
    )
    caption = _card_caption(ctx, payload)
    file_id = await ctx.app.images.get(ctx.user.user_id, kind, key, CARD_TTL)
    if file_id:
        with suppress(TelegramBadRequest):
            return await ctx.bot.send_photo(chat_id, file_id, caption=caption, reply_markup=kb)
    started = time.perf_counter()
    async with ChatActionSender.upload_photo(chat_id=chat_id, bot=ctx.bot):
        image = await cards.render_profile_card(ctx.app.renderer, payload, ctx.lang, ctx.app.bot_username)
        message = await ctx.bot.send_photo(
            chat_id,
            BufferedInputFile(image, filename=f"{user['name']}.jpg"),
            caption=caption,
            reply_markup=kb,
        )
    log.info("Profile card for %s delivered in %.0f ms", user["name"], (time.perf_counter() - started) * 1000)
    if message.photo:
        await ctx.app.images.set(ctx.user.user_id, kind, key, message.photo[-1].file_id)
    return message


async def send_wrapped(ctx: Ctx, chat_id: int, name: str, year: int) -> Message | None:
    _ = ctx._
    token = ctx.user.token if ctx.user.authorized else None
    user = await cards.fetch_card_user(ctx.app.anilist, name, token)
    if not user:
        await ctx.bot.send_message(chat_id, _("profile.not_found", name=b(name)))
        return None
    kind = f"wrapped:{user['id']}:{year}"
    async with ChatActionSender.upload_photo(chat_id=chat_id, bot=ctx.bot):
        payload = await cards.wrapped_payload(ctx.app.anilist, user, year, token)
        key = cards.digest([payload, ctx.lang])
        caption = _(
            "wrapped.caption",
            name=b(user["name"]),
            year=year,
            episodes=b(payload["episodes"]),
            hours=b(payload["hours"]),
        )
        kb = Kb().row(btn(_("card.open_profile"), f"/u/{user['name']}")).build()
        file_id = await ctx.app.images.get(ctx.user.user_id, kind, key, WRAPPED_TTL)
        if file_id:
            with suppress(TelegramBadRequest):
                return await ctx.bot.send_photo(chat_id, file_id, caption=caption, reply_markup=kb)
        if not payload["activities"]:
            await ctx.bot.send_message(chat_id, _("wrapped.empty", year=year))
            return None
        image = await cards.render_wrapped(ctx.app.renderer, payload, ctx.lang, ctx.app.bot_username)
        message = await ctx.bot.send_photo(
            chat_id, BufferedInputFile(image, filename=f"wrapped-{year}.jpg"), caption=caption, reply_markup=kb
        )
    if message.photo:
        await ctx.app.images.set(ctx.user.user_id, kind, key, message.photo[-1].file_id)
    return message


def _chat_id(cb: CallbackQuery) -> int:
    return cb.message.chat.id if isinstance(cb.message, Message) else cb.from_user.id


@router.callback_query(F.data.startswith("!card:"))
async def on_card(cb: CallbackQuery, ctx: Ctx) -> None:
    name = (cb.data or "").split(":", 1)[1]
    await answer(cb, ctx._("card.generating"))
    await send_profile_card(ctx, _chat_id(cb), name)


@router.callback_query(F.data.startswith("!wr:"))
async def on_wrapped(cb: CallbackQuery, ctx: Ctx) -> None:
    _, year, name = (cb.data or "").split(":", 2)
    await answer(cb, ctx._("card.generating"))
    await send_wrapped(ctx, _chat_id(cb), name, int(year))
