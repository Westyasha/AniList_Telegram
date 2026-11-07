import re

from aiogram import F, Router
from aiogram.types import Message

from app.anilist import queries as q
from app.anilist.client import AniListError
from app.anilist.oauth import exchange_code
from app.bot import navigation as nav
from app.bot.context import Ctx
from app.bot.handlers.commands import delete_quietly, render_into, search_text
from app.bot.menu import main_menu
from app.bot.states import Input
from app.bot.ui import b
from app.services.auth import link_account

router = Router(name="inputs")
router.message.filter(F.chat.type == "private")

JWT_RE = re.compile(r"^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$")


@router.message(Input.text, F.text)
async def on_input(message: Message, ctx: Ctx) -> None:
    assert ctx.state is not None
    data = await ctx.state.get_data()
    kind = str(data.get("input") or "")
    target = data.get("target")
    text = (message.text or "").strip()
    await ctx.state.set_state(None)
    if text.startswith("/"):
        return
    if kind.startswith("search:"):
        await delete_quietly(message)
        search_kind = kind.split(":", 1)[1]
        if search_kind == "U":
            await render_into(ctx, target, message.chat.id, f"/u/{text.split()[0][:40]}")
            return
        digest = await ctx.app.texts.put(text[:200])
        await render_into(ctx, target, message.chat.id, f"/s/{search_kind}/{digest}/1")
        return
    if kind.startswith("notes:"):
        await delete_quietly(message)
        media_id = int(kind.split(":", 1)[1])
        await ctx.gql(q.SAVE_ENTRY, {"mediaId": media_id, "notes": text[:2000]}, auth=True)
        ctx.app.anilist.invalidate()
        await render_into(ctx, target, message.chat.id, f"/m/{media_id}")
        return
    if kind == "auth":
        await delete_quietly(message)
        await _complete_pin_login(message, ctx, text, target)
        return
    await search_text(message, ctx, "A", text)


async def _complete_pin_login(message: Message, ctx: Ctx, text: str, target: str | None) -> None:
    settings = ctx.app.settings
    try:
        if JWT_RE.match(text) and len(text) > 200:
            viewer = await link_account(ctx.app, ctx.user.user_id, text)
        else:
            token = await exchange_code(
                ctx.app.anilist.session,
                client_id=settings.anilist_client_id,
                client_secret=settings.anilist_client_secret.get_secret_value(),
                redirect_uri=settings.anilist_redirect_uri,
                code=text,
            )
            viewer = await link_account(ctx.app, ctx.user.user_id, token.access_token, token.expires_at)
    except AniListError:
        await message.answer(ctx._("auth.failed"))
        return
    refreshed = await ctx.app.users.get(ctx.user.user_id)
    if refreshed:
        ctx.user = refreshed
    await message.answer(ctx._("auth.success", name=b(viewer.name)), reply_markup=main_menu(ctx))
    await render_into(ctx, target, message.chat.id, nav.HOME)


@router.message(F.text & ~F.text.startswith("/"))
async def on_free_text(message: Message, ctx: Ctx) -> None:
    text = (message.text or "").strip()
    if len(text) < 2:
        return
    await search_text(message, ctx, "A", text)
