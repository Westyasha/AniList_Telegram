from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InputMediaPhoto
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from config import ANILIST_CLIENT_ID, ANILIST_AUTH_URL
from storage import get_token, set_token, remove_token, get_anilist_id, set_anilist_id
from core.api import anilist_query, Q_VIEWER
from core.formatters import esc
from keyboards import main_menu, auth_kb, auth_menu_kb, settings_kb
from locales.i18n import t

router = Router()

WELCOME_IMAGE = "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhKBUDDEig.jpg"


class AuthState(StatesGroup):
    waiting_token = State()


def auth_url(uid: int) -> str:
    return f"{ANILIST_AUTH_URL}?client_id={ANILIST_CLIENT_ID}&response_type=token"


async def _send_welcome(msg: Message, uid: int, viewer: dict = None):
    if viewer:
        name = esc(viewer.get("name", "?"))
        status = t(uid, "auth_status_ok", name=name)
        banner = viewer.get("bannerImage")
        avatar = (viewer.get("avatar") or {}).get("large")
        welcome_text = t(uid, "welcome", status=status)

        if banner and avatar:
            try:
                media_group = [
                    InputMediaPhoto(media=banner, caption=welcome_text, parse_mode="MarkdownV2"),
                    InputMediaPhoto(media=avatar),
                ]
                await msg.answer_media_group(media=media_group)
                await msg.answer("⬇️", reply_markup=main_menu(uid))
                return
            except Exception:
                pass
        photo = banner or avatar
        if photo:
            try:
                await msg.answer_photo(photo=photo, caption=welcome_text, parse_mode="MarkdownV2", reply_markup=main_menu(uid))
                return
            except Exception:
                pass
        await msg.answer(welcome_text, parse_mode="MarkdownV2", reply_markup=main_menu(uid))
    else:
        status = t(uid, "auth_status_no")
        welcome_text = t(uid, "welcome", status=status)
        try:
            await msg.answer_photo(photo=WELCOME_IMAGE, caption=welcome_text, parse_mode="MarkdownV2", reply_markup=main_menu(uid))
        except Exception:
            await msg.answer(welcome_text, parse_mode="MarkdownV2", reply_markup=main_menu(uid))


@router.message(F.text == "/start")
async def cmd_start(msg: Message):
    uid = msg.from_user.id
    token = get_token(uid)
    viewer = None
    if token:
        result = await anilist_query(Q_VIEWER, token=token)
        viewer = result.get("data", {}).get("Viewer")
        if viewer:
            set_anilist_id(uid, viewer["id"])
    await _send_welcome(msg, uid, viewer)


@router.message(F.text.in_({"⚙️ Настройки", "⚙️ Settings"}))
async def settings_cmd(msg: Message):
    uid = msg.from_user.id
    await msg.answer(t(uid, "settings_title"), parse_mode="MarkdownV2", reply_markup=settings_kb(uid))


@router.callback_query(F.data == "openauth")
async def open_auth(cb: CallbackQuery):
    uid = cb.from_user.id
    await cb.message.answer(t(uid, "auth_choose"), parse_mode="MarkdownV2",
                            reply_markup=auth_kb(uid, auth_url(uid)))
    await cb.answer()


@router.callback_query(F.data == "settings:lang")
async def settings_lang(cb: CallbackQuery):
    from keyboards import lang_kb
    uid = cb.from_user.id
    await cb.message.answer(t(uid, "settings_lang_select"), parse_mode="MarkdownV2", reply_markup=lang_kb())
    await cb.answer()


@router.callback_query(F.data.startswith("setlang:"))
async def set_lang_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    lang = cb.data.split(":")[1]
    from storage import set_lang
    set_lang(uid, lang)
    msg = t(uid, "settings_lang_changed")
    await cb.message.answer(msg, parse_mode="MarkdownV2", reply_markup=main_menu(uid))
    await cb.answer()


@router.message(F.text.in_({"🔐 Авторизация", "🔐 Auth"}))
async def auth_cmd(msg: Message):
    uid = msg.from_user.id
    token = get_token(uid)
    if token:
        await msg.answer(t(uid, "auth_already"), reply_markup=auth_menu_kb(uid))
    else:
        await msg.answer(t(uid, "auth_choose"), parse_mode="MarkdownV2",
                         reply_markup=auth_kb(uid, auth_url(uid)))


@router.callback_query(F.data == "manual_token")
async def manual_token(cb: CallbackQuery, state: FSMContext):
    uid = cb.from_user.id
    await cb.message.answer(t(uid, "auth_manual_inst"), parse_mode="MarkdownV2")
    await state.set_state(AuthState.waiting_token)
    await cb.answer()


@router.message(AuthState.waiting_token)
async def receive_token(msg: Message, state: FSMContext):
    uid = msg.from_user.id
    token = msg.text.strip()
    await state.clear()
    result = await anilist_query(Q_VIEWER, token=token)
    viewer = result.get("data", {}).get("Viewer")
    if not viewer:
        await msg.answer(t(uid, "auth_fail"), parse_mode="MarkdownV2")
        return
    set_token(uid, token, viewer["id"])
    await _send_welcome(msg, uid, viewer)


@router.callback_query(F.data == "logout")
async def logout(cb: CallbackQuery):
    uid = cb.from_user.id
    remove_token(uid)
    await cb.message.answer(t(uid, "logout_done"), parse_mode="MarkdownV2", reply_markup=main_menu(uid))
    await cb.answer()


@router.callback_query(F.data == "myprofile")
async def my_profile_cb(cb: CallbackQuery):
    from handlers.browse import show_profile
    await show_profile(cb, cb.from_user.id)
    await cb.answer()

@router.callback_query(F.data == "settings:notif")
async def settings_notif_cb(cb: CallbackQuery):
    from storage import get_notifications_enabled, set_notifications_enabled
    uid = cb.from_user.id
    current = get_notifications_enabled(uid)
    set_notifications_enabled(uid, not current)
    from keyboards import settings_kb
    try:
        await cb.message.edit_reply_markup(reply_markup=settings_kb(uid))
    except Exception:
        pass
    lang = get_lang(uid)
    msg = ("🔔 Уведомления включены" if not current else "🔕 Уведомления выключены") if lang == "ru" else ("🔔 Notifications enabled" if not current else "🔕 Notifications disabled")
    await cb.answer(msg, show_alert=True)
