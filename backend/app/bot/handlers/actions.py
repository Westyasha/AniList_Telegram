from typing import Any

from aiogram import F, Router
from aiogram.types import CallbackQuery, Message

from app.anilist import helpers
from app.anilist import queries as q
from app.bot import navigation as nav
from app.bot.context import Ctx
from app.bot.handlers.navigation import answer
from app.bot.menu import main_menu
from app.bot.screens.search import GENRES
from app.bot.views import status_label
from app.db.models import DEFAULT_LAYOUT, MENU_BUTTONS, NOTIFICATION_DEFAULTS
from app.i18n import LANGUAGES, i18n

router = Router(name="actions")


def parts(cb: CallbackQuery) -> list[str]:
    return (cb.data or "")[1:].split(":")


async def media_entry(ctx: Ctx, media_id: int) -> dict[str, Any]:
    data = await ctx.gql(q.MEDIA_BRIEF, {"id": media_id}, auth=True)
    return data.get("Media") or {}


async def save(ctx: Ctx, **variables: Any) -> dict[str, Any]:
    data = await ctx.gql(q.SAVE_ENTRY, variables, auth=True)
    ctx.app.anilist.invalidate()
    return data.get("SaveMediaListEntry") or {}


def next_progress_state(media: dict[str, Any], delta: int) -> dict[str, Any]:
    entry = media.get("mediaListEntry") or {}
    status = entry.get("status")
    total = helpers.total_units(media)
    progress = max(0, (entry.get("progress") or 0) + delta)
    if total:
        progress = min(progress, total)
    variables: dict[str, Any] = {"mediaId": media["id"], "progress": progress}
    if total and progress >= total and delta > 0:
        variables["status"] = "COMPLETED"
        if status == "REPEATING":
            variables["repeat"] = (entry.get("repeat") or 0) + 1
    elif (status in (None, "PLANNING", "PAUSED", "DROPPED") and delta > 0) or (status == "COMPLETED" and delta < 0):
        variables["status"] = "CURRENT"
    return variables


@router.callback_query(F.data.startswith("!p:"))
async def on_progress(cb: CallbackQuery, ctx: Ctx) -> None:
    _, media_id, delta = parts(cb)
    media = await media_entry(ctx, int(media_id))
    variables = next_progress_state(media, int(delta))
    result = await save(ctx, **variables)
    total = helpers.total_units(media) or "?"
    text = ctx._("toast.progress", cur=result.get("progress", variables["progress"]), total=total)
    if result.get("status") == "COMPLETED" and variables.get("status") == "COMPLETED":
        text += "\n" + ctx._("toast.completed")
    await answer(cb, text)
    await nav.refresh(ctx, cb)


@router.callback_query(F.data.startswith("!pe:"))
async def on_episode_watched(cb: CallbackQuery, ctx: Ctx) -> None:
    _, media_id, episode = parts(cb)
    media = await media_entry(ctx, int(media_id))
    entry = media.get("mediaListEntry") or {}
    target = max(int(episode), entry.get("progress") or 0)
    variables = next_progress_state(media, target - (entry.get("progress") or 0))
    variables["progress"] = target
    await save(ctx, **variables)
    await answer(cb, ctx._("toast.progress", cur=target, total=helpers.total_units(media) or "?"))
    if isinstance(cb.message, Message) and cb.message.reply_markup:
        rows = [
            [button for button in row if button.callback_data != cb.data]
            for row in cb.message.reply_markup.inline_keyboard
        ]
        cb.message.reply_markup.inline_keyboard = [row for row in rows if row]
        await cb.message.edit_reply_markup(reply_markup=cb.message.reply_markup)


@router.callback_query(F.data.startswith("!st:"))
async def on_status(cb: CallbackQuery, ctx: Ctx) -> None:
    _, media_id, status = parts(cb)
    if status not in helpers.LIST_STATUSES:
        await answer(cb)
        return
    variables: dict[str, Any] = {"mediaId": int(media_id), "status": status}
    if status == "COMPLETED":
        media = await media_entry(ctx, int(media_id))
        total = helpers.total_units(media)
        if total:
            variables["progress"] = total
    await save(ctx, **variables)
    await answer(cb, ctx._("toast.status", status=status_label(ctx, status)))
    await nav.back(ctx, cb)


@router.callback_query(F.data.startswith("!sc:"))
async def on_score(cb: CallbackQuery, ctx: Ctx) -> None:
    _, media_id, raw = parts(cb)
    value = max(0, min(100, int(raw)))
    await save(ctx, mediaId=int(media_id), scoreRaw=value)
    text = (
        ctx._("toast.score", score=helpers.score_from_raw(value, ctx.user.score_format))
        if value
        else ctx._("toast.score_cleared")
    )
    await answer(cb, text)
    await nav.back(ctx, cb)


@router.callback_query(F.data.startswith("!del:"))
async def on_delete(cb: CallbackQuery, ctx: Ctx) -> None:
    _, media_id = parts(cb)
    media = await media_entry(ctx, int(media_id))
    entry = media.get("mediaListEntry")
    if entry:
        await ctx.gql(q.DELETE_ENTRY, {"id": entry["id"]}, auth=True)
        ctx.app.anilist.invalidate()
    await answer(cb, ctx._("toast.deleted"))
    target = nav.Target.of(cb)
    if target:
        await nav.open_at(ctx, target, f"/m/{media_id}")


@router.callback_query(F.data.startswith("!ntc:"))
async def on_notes_clear(cb: CallbackQuery, ctx: Ctx) -> None:
    _, media_id = parts(cb)
    await save(ctx, mediaId=int(media_id), notes="")
    if ctx.state is not None:
        await ctx.state.set_state(None)
    await answer(cb, ctx._("toast.notes_saved"))
    await nav.back(ctx, cb)


FAVOURITE_KEYS = {"a": "animeId", "m": "mangaId", "c": "characterId", "s": "staffId"}


@router.callback_query(F.data.startswith("!fv:"))
async def on_favourite(cb: CallbackQuery, ctx: Ctx) -> None:
    _, kind, entity_id = parts(cb)
    key = FAVOURITE_KEYS.get(kind)
    if key is None:
        await answer(cb)
        return
    await ctx.gql(q.TOGGLE_FAVOURITE, {key: int(entity_id)}, auth=True)
    ctx.app.anilist.invalidate()
    await answer(cb, ctx._("toast.favourite"))
    await nav.refresh(ctx, cb)


@router.callback_query(F.data.startswith("!fl:"))
async def on_follow(cb: CallbackQuery, ctx: Ctx) -> None:
    _, user_id, _name = parts(cb)
    data = await ctx.gql(q.TOGGLE_FOLLOW, {"userId": int(user_id)}, auth=True)
    ctx.app.anilist.invalidate()
    following = (data.get("ToggleFollow") or {}).get("isFollowing")
    await answer(cb, ctx._("toast.followed" if following else "toast.unfollowed"))
    await nav.refresh(ctx, cb)


@router.callback_query(F.data.startswith("!lang:"))
async def on_language(cb: CallbackQuery, ctx: Ctx) -> None:
    _, lang = parts(cb)
    if lang not in LANGUAGES:
        await answer(cb)
        return
    await ctx.app.users.set_lang(ctx.user.user_id, lang)
    ctx.user.lang = lang
    ctx._ = i18n.get(lang)
    await answer(cb, ctx._("toast.language"))
    await nav.back(ctx, cb)
    if isinstance(cb.message, Message):
        await cb.message.answer(ctx._("settings.language_changed"), reply_markup=main_menu(ctx))


@router.callback_query(F.data.startswith("!n:"))
async def on_notification_toggle(cb: CallbackQuery, ctx: Ctx) -> None:
    _, key = parts(cb)
    if key not in NOTIFICATION_DEFAULTS:
        await answer(cb)
        return
    settings = dict(ctx.user.notifications)
    settings[key] = not settings.get(key)
    await ctx.app.users.set_notifications(ctx.user.user_id, settings)
    ctx.user.notifications = settings
    await answer(cb)
    await nav.refresh(ctx, cb)


@router.callback_query(F.data.startswith("!kb:"))
async def on_keyboard(cb: CallbackQuery, ctx: Ctx) -> None:
    _, key = parts(cb)
    if key == "reset":
        layout = [row[:] for row in DEFAULT_LAYOUT]
    elif key in MENU_BUTTONS and key != "settings":
        layout = [row[:] for row in ctx.user.keyboard_layout]
        flat = [k for row in layout for k in row]
        if key in flat:
            layout = [[k for k in row if k != key] for row in layout]
            layout = [row for row in layout if row]
        else:
            settings_row = [row for row in layout if "settings" in row]
            body = [row for row in layout if "settings" not in row]
            if body and len(body[-1]) < 2:
                body[-1].append(key)
            else:
                body.append([key])
            layout = body + settings_row
    else:
        await answer(cb)
        return
    await ctx.app.users.set_layout(ctx.user.user_id, layout)
    ctx.user.keyboard_layout = (await ctx.app.users.get(ctx.user.user_id) or ctx.user).keyboard_layout
    await answer(cb)
    await nav.refresh(ctx, cb)
    if isinstance(cb.message, Message):
        await cb.message.answer(ctx._("settings.keyboard_saved"), reply_markup=main_menu(ctx))


@router.callback_query(F.data == "!cache")
async def on_clear_cache(cb: CallbackQuery, ctx: Ctx) -> None:
    await ctx.app.images.clear(ctx.user.user_id)
    ctx.app.anilist.invalidate()
    await answer(cb, ctx._("toast.cache_cleared"), alert=True)


@router.callback_query(F.data == "!logout")
async def on_logout(cb: CallbackQuery, ctx: Ctx) -> None:
    await ctx.app.users.clear_auth(ctx.user.user_id)
    ctx.user.token = None
    ctx.user.anilist_id = None
    ctx.user.anilist_name = None
    await answer(cb, ctx._("toast.logged_out"))
    target = nav.Target.of(cb)
    if target:
        await nav.open_at(ctx, target, nav.HOME)


async def _filter(ctx: Ctx) -> dict[str, Any]:
    if ctx.state is None:
        return {}
    data = await ctx.state.get_data()
    value = data.get("filter")
    return dict(value) if isinstance(value, dict) else {}


@router.callback_query(F.data.startswith("!f:"))
async def on_filter(cb: CallbackQuery, ctx: Ctx) -> None:
    items = parts(cb)
    action = items[1]
    value = items[2] if len(items) > 2 else ""
    current = await _filter(ctx)
    stay = False
    if action == "reset":
        current = {}
        stay = True
    elif action == "g" and value in GENRES:
        genres = list(current.get("genres") or [])
        if value in genres:
            genres.remove(value)
        else:
            genres.append(value)
        current["genres"] = genres
        stay = True
    elif action == "y":
        current["year"] = int(value) if value.isdigit() and int(value) else None
    elif action == "fm":
        current["format"] = value if value != "0" else None
    elif action == "sc":
        current["score"] = int(value) if value.isdigit() and int(value) else None
    elif action == "so":
        current["sort"] = value
    if ctx.state is not None:
        await ctx.state.update_data(filter=current)
    await answer(cb)
    if stay:
        await nav.refresh(ctx, cb)
    else:
        await nav.back(ctx, cb)
