from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import InlineKeyboardButton

from core.api import anilist_query, Q_MEDIA_DETAIL, Q_MEDIA_CHARACTERS, Q_MEDIA_STAFF, Q_CHARACTER, Q_STAFF, M_TOGGLE_FAVOURITE
from core.formatters import media_card, char_card, staff_card
from keyboards import media_kb, chars_kb, staff_list_kb, related_kb, recs_kb, char_kb, staff_person_kb
from locales.i18n import t
from storage import get_token

router = Router()


async def send_media(target, media_id: int, uid: int):
    from aiogram.types import InputMediaPhoto
    token = get_token(uid)
    result = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    media = result.get("data", {}).get("Media")
    if not media:
        await target.answer(t(uid, "not_found"), parse_mode="MarkdownV2")
        return
    in_list = bool(media.get("mediaListEntry"))
    caption = media_card(media)
    kb = media_kb(uid, media_id, media["type"], in_list)
    cover = (media.get("coverImage") or {}).get("extraLarge") or (media.get("coverImage") or {}).get("large")
    banner = media.get("bannerImage")

    if banner and cover:
        try:
            await target.answer_media_group(media=[
                InputMediaPhoto(media=banner),
                InputMediaPhoto(media=cover, caption=caption, parse_mode="MarkdownV2"),
            ])
            await target.answer("⬆️ выбери действие:", reply_markup=kb)
            return
        except Exception:
            pass
    if cover:
        try:
            await target.answer_photo(photo=cover, caption=caption, parse_mode="MarkdownV2", reply_markup=kb)
            return
        except Exception:
            pass
    await target.answer(caption, parse_mode="MarkdownV2", reply_markup=kb)


@router.callback_query(F.data.startswith("media:"))
async def media_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    await send_media(cb.message, media_id, uid)
    await cb.answer()


@router.callback_query(F.data.startswith("chars:"))
async def chars_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":")
    media_id, page = int(parts[1]), int(parts[2])
    token = get_token(uid)
    result = await anilist_query(Q_MEDIA_CHARACTERS, {"id": media_id, "page": page}, token=token)
    char_data = result.get("data", {}).get("Media", {}).get("characters", {})
    edges = char_data.get("edges", [])
    pinfo = char_data.get("pageInfo", {})
    if not edges:
        await cb.answer(t(uid, "chars_empty"), show_alert=True)
        return
    await cb.message.answer(t(uid, "chars_title", page=page), parse_mode="MarkdownV2",
                             reply_markup=chars_kb(uid, edges, media_id, page, pinfo.get("hasNextPage", False)))
    await cb.answer()


@router.callback_query(F.data.startswith("stafflist:"))
async def stafflist_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":")
    media_id, page = int(parts[1]), int(parts[2])
    token = get_token(uid)
    result = await anilist_query(Q_MEDIA_STAFF, {"id": media_id, "page": page}, token=token)
    staff_data = result.get("data", {}).get("Media", {}).get("staff", {})
    edges = staff_data.get("edges", [])
    pinfo = staff_data.get("pageInfo", {})
    if not edges:
        await cb.answer(t(uid, "staff_empty"), show_alert=True)
        return
    await cb.message.answer(t(uid, "staff_title", page=page), parse_mode="MarkdownV2",
                             reply_markup=staff_list_kb(uid, edges, media_id, page, pinfo.get("hasNextPage", False)))
    await cb.answer()


@router.callback_query(F.data.startswith("char:"))
async def char_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    char_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    result = await anilist_query(Q_CHARACTER, {"id": char_id}, token=token)
    char = result.get("data", {}).get("Character")
    if not char:
        await cb.answer(t(uid, "not_found"), show_alert=True)
        return
    caption = char_card(char)
    image = (char.get("image") or {}).get("large")
    kb = char_kb(uid, char_id)
    if image:
        try:
            await cb.message.answer_photo(photo=image, caption=caption, parse_mode="MarkdownV2", reply_markup=kb)
            await cb.answer()
            return
        except Exception:
            pass
    await cb.message.answer(caption, parse_mode="MarkdownV2", reply_markup=kb)
    await cb.answer()


@router.callback_query(F.data.startswith("staffperson:"))
async def staffperson_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    staff_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    result = await anilist_query(Q_STAFF, {"id": staff_id}, token=token)
    staff = result.get("data", {}).get("Staff")
    if not staff:
        await cb.answer(t(uid, "not_found"), show_alert=True)
        return
    caption = staff_card(staff)
    image = (staff.get("image") or {}).get("large")
    kb = staff_person_kb(uid, staff_id)
    if image:
        try:
            await cb.message.answer_photo(photo=image, caption=caption, parse_mode="MarkdownV2", reply_markup=kb)
            await cb.answer()
            return
        except Exception:
            pass
    await cb.message.answer(caption, parse_mode="MarkdownV2", reply_markup=kb)
    await cb.answer()


@router.callback_query(F.data.startswith("related:"))
async def related_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    result = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    media = result.get("data", {}).get("Media", {})
    edges = media.get("relations", {}).get("edges", [])
    if not edges:
        await cb.answer(t(uid, "related_empty"), show_alert=True)
        return
    await cb.message.answer(t(uid, "related_title"), parse_mode="MarkdownV2",
                             reply_markup=related_kb(uid, edges, media_id))
    await cb.answer()


@router.callback_query(F.data.startswith("recs:"))
async def recs_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    result = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    media = result.get("data", {}).get("Media", {})
    nodes = media.get("recommendations", {}).get("nodes", [])
    if not nodes:
        await cb.answer(t(uid, "recs_empty"), show_alert=True)
        return
    await cb.message.answer(t(uid, "recs_title"), parse_mode="MarkdownV2",
                             reply_markup=recs_kb(uid, nodes, media_id))
    await cb.answer()


@router.callback_query(F.data.startswith("togglefav:"))
async def togglefav_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":")
    media_id, mtype = int(parts[1]), parts[2]
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    vars_map = {"ANIME": {"animeId": media_id}, "MANGA": {"mangaId": media_id}}
    await anilist_query(M_TOGGLE_FAVOURITE, vars_map.get(mtype, {"animeId": media_id}), token=token)
    await cb.answer(t(uid, "fav_updated"), show_alert=True)


@router.callback_query(F.data.startswith("favchar:"))
async def favchar_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    char_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    await anilist_query(M_TOGGLE_FAVOURITE, {"characterId": char_id}, token=token)
    await cb.answer(t(uid, "fav_updated"), show_alert=True)


@router.callback_query(F.data.startswith("favstaff:"))
async def favstaff_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    staff_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    await anilist_query(M_TOGGLE_FAVOURITE, {"staffId": staff_id}, token=token)
    await cb.answer(t(uid, "fav_updated"), show_alert=True)
