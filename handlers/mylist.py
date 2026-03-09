from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from core.api import anilist_query, Q_USER_LIST, Q_MEDIA_DETAIL, M_SAVE_LIST_ENTRY, M_DELETE_LIST_ENTRY
from keyboards import my_list_menu_kb, list_entries_kb, list_status_kb, score_kb
from locales.i18n import t
from storage import get_token, get_anilist_id

router = Router()
PER_PAGE = 8


class ListState(StatesGroup):
    waiting_notes = State()


@router.message(F.text.in_({"📋 Мой список", "📋 My List"}))
async def mylist_cmd(msg: Message):
    uid = msg.from_user.id
    if not get_token(uid):
        await msg.answer(t(uid, "mylist_need_auth"), parse_mode="MarkdownV2")
        return
    await msg.answer(t(uid, "mylist_title"), parse_mode="MarkdownV2", reply_markup=my_list_menu_kb(uid))


@router.callback_query(F.data == "mylistmenu")
async def mylistmenu_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    try:
        await cb.message.edit_text(t(uid, "mylist_title"), parse_mode="MarkdownV2", reply_markup=my_list_menu_kb(uid))
    except Exception:
        await cb.message.answer(t(uid, "mylist_title"), parse_mode="MarkdownV2", reply_markup=my_list_menu_kb(uid))
    await cb.answer()


@router.callback_query(F.data.startswith("mylist_tab:"))
async def mylist_tab_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    from keyboards import my_list_manga_kb
    tab = cb.data.split(":")[1]
    if tab == "MANGA":
        kb = my_list_manga_kb(uid)
        text = "📚 *Manga List*"
    else:
        kb = my_list_menu_kb(uid)
        text = "📺 *Anime List*"
    try:
        await cb.message.edit_text(text, parse_mode="MarkdownV2", reply_markup=kb)
    except Exception:
        await cb.message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)
    await cb.answer()


@router.callback_query(F.data.startswith("mylist:"))
async def mylist_view(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":")
    mtype, status, page = parts[1], parts[2], int(parts[3])

    token = get_token(uid)
    anilist_id = get_anilist_id(uid)
    if not token or not anilist_id:
        await cb.answer(t(uid, "mylist_need_auth"), show_alert=True)
        return

    result = await anilist_query(Q_USER_LIST, {"userId": anilist_id, "type": mtype, "status": status}, token=token)
    lists_data = result.get("data", {}).get("MediaListCollection", {}).get("lists", [])

    entries = []
    for lst in lists_data:
        entries.extend(lst.get("entries", []))

    if not entries:
        await cb.answer(t(uid, "list_empty"), show_alert=True)
        return

    entries.sort(key=lambda e: e.get("updatedAt") or 0, reverse=True)

    total = len(entries)
    start = (page - 1) * PER_PAGE
    has_prev = page > 1
    has_next = (start + PER_PAGE) < total

    icons = {"CURRENT": "▶️", "COMPLETED": "✅", "PLANNING": "⏸", "DROPPED": "⏹", "PAUSED": "⏸", "REPEATING": "🔄"}
    icon = icons.get(status, "📋")
    type_label = "Anime" if mtype == "ANIME" else "Manga"

    from core.formatters import esc
    text = f"{icon} *{esc(type_label)}* — *{esc(status.title())}*\n_{esc(str(total))} titles, page {page}_"
    kb = list_entries_kb(uid, entries, mtype, status, page, has_prev, has_next)
    try:
        await cb.message.edit_text(text, parse_mode="MarkdownV2", reply_markup=kb)
    except Exception:
        await cb.message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)
    await cb.answer()


@router.callback_query(F.data.startswith("liststatus:"))
async def liststatus_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":")
    media_id = int(parts[1])
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    result = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    media = result.get("data", {}).get("Media", {})
    entry = media.get("mediaListEntry")
    current_status = entry["status"] if entry else None
    title = media.get("title", {}).get("english") or media.get("title", {}).get("romaji") or "?"
    from core.formatters import esc
    await cb.message.answer(
        t(uid, "choose_status", title=esc(title)),
        parse_mode="MarkdownV2",
        reply_markup=list_status_kb(uid, media_id, current_status)
    )
    await cb.answer()


@router.callback_query(F.data.startswith("setstatus:"))
async def setstatus_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":")
    media_id, status = int(parts[1]), parts[2]
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    result = await anilist_query(M_SAVE_LIST_ENTRY, {"mediaId": media_id, "status": status}, token=token)
    if "errors" in result:
        await cb.answer(t(uid, "save_error"), show_alert=True)
        return
    status_key = f"status_{status.lower()}"
    await cb.answer(t(uid, "status_set", status=t(uid, status_key)), show_alert=True)


@router.callback_query(F.data.startswith("dellist:"))
async def dellist_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    result = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    entry = result.get("data", {}).get("Media", {}).get("mediaListEntry")
    if not entry:
        await cb.answer("Not in list", show_alert=True)
        return
    del_result = await anilist_query(M_DELETE_LIST_ENTRY, {"id": entry["id"]}, token=token)
    if del_result.get("data", {}).get("DeleteMediaListEntry", {}).get("deleted"):
        await cb.answer(t(uid, "deleted_from_list"), show_alert=True)
    else:
        await cb.answer(t(uid, "delete_error"), show_alert=True)


@router.callback_query(F.data.startswith("progress:"))
async def progress_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    result = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    media = result.get("data", {}).get("Media", {})
    entry = media.get("mediaListEntry")
    cur = (entry.get("progress") or 0) if entry else 0
    cur_status = entry.get("status", "CURRENT") if entry else "CURRENT"
    new_prog = cur + 1
    total = media.get("episodes") or media.get("chapters")
    new_status = "COMPLETED" if (total and new_prog >= total) else cur_status
    await anilist_query(M_SAVE_LIST_ENTRY, {"mediaId": media_id, "progress": new_prog, "status": new_status}, token=token)
    complete = t(uid, "progress_complete") if new_status == "COMPLETED" else ""
    total_str = str(total) if total else "?"
    await cb.answer(t(uid, "progress_updated", cur=new_prog, total=total_str, complete=complete), show_alert=True)


@router.callback_query(F.data.startswith("progress_minus:"))
async def progress_minus_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    result = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    media = result.get("data", {}).get("Media", {})
    entry = media.get("mediaListEntry")
    cur = (entry.get("progress") or 0) if entry else 0
    if cur <= 0:
        await cb.answer(t(uid, "progress_already_zero"), show_alert=True)
        return
    new_prog = cur - 1
    cur_status = entry.get("status", "CURRENT") if entry else "CURRENT"
    new_status = "CURRENT" if cur_status == "COMPLETED" else cur_status
    await anilist_query(M_SAVE_LIST_ENTRY, {"mediaId": media_id, "progress": new_prog, "status": new_status}, token=token)
    total = media.get("episodes") or media.get("chapters")
    total_str = str(total) if total else "?"
    await cb.answer(t(uid, "progress_updated", cur=new_prog, total=total_str, complete=""), show_alert=True)


@router.callback_query(F.data.startswith("rate:"))
async def rate_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    if not get_token(uid):
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    try:
        await cb.message.edit_text(t(uid, "choose_score"), parse_mode="MarkdownV2", reply_markup=score_kb(media_id))
    except Exception:
        await cb.message.answer(t(uid, "choose_score"), parse_mode="MarkdownV2", reply_markup=score_kb(media_id))
    await cb.answer()


@router.callback_query(F.data.startswith("setscore:"))
async def setscore_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":")
    media_id, score = int(parts[1]), float(parts[2])
    token = get_token(uid)
    if not token:
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    result = await anilist_query(M_SAVE_LIST_ENTRY, {"mediaId": media_id, "score": score}, token=token)
    if "errors" in result:
        await cb.answer(t(uid, "save_error"), show_alert=True)
        return
    msg = t(uid, "score_saved", score=int(score)) if score else t(uid, "score_removed")
    await cb.answer(msg, show_alert=True)
    # Restore media card keyboard
    from core.api import Q_MEDIA_DETAIL
    detail = await anilist_query(Q_MEDIA_DETAIL, {"id": media_id}, token=token)
    media = detail.get("data", {}).get("Media", {})
    entry = media.get("mediaListEntry")
    if media:
        from core.formatters import media_card
        from keyboards import media_kb
        mtype = media.get("type", "ANIME")
        try:
            caption = media_card(media)
            kb = media_kb(uid, media_id, mtype, bool(entry))
            await cb.message.edit_text(caption, parse_mode="MarkdownV2", reply_markup=kb)
        except Exception:
            pass


@router.callback_query(F.data.startswith("notes:"))
async def notes_cb(cb: CallbackQuery, state: FSMContext):
    uid = cb.from_user.id
    media_id = int(cb.data.split(":")[1])
    if not get_token(uid):
        await cb.answer(t(uid, "auth_need"), show_alert=True)
        return
    await state.update_data(notes_media_id=media_id)
    await state.set_state(ListState.waiting_notes)
    await cb.message.answer(t(uid, "notes_enter"))
    await cb.answer()


@router.message(ListState.waiting_notes)
async def save_notes(msg: Message, state: FSMContext):
    uid = msg.from_user.id
    data = await state.get_data()
    media_id = data.get("notes_media_id")
    await state.clear()
    token = get_token(uid)
    result = await anilist_query(M_SAVE_LIST_ENTRY, {"mediaId": media_id, "notes": msg.text.strip()}, token=token)
    if "errors" in result:
        await msg.answer(t(uid, "notes_error"), parse_mode="MarkdownV2")
    else:
        await msg.answer(t(uid, "notes_saved"), parse_mode="MarkdownV2")
