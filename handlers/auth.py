from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from config import ANILIST_CLIENT_ID, ANILIST_AUTH_URL
from storage import get_token, set_token, remove_token, get_anilist_id, set_anilist_id, get_lang
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
    from core.image_gen import generate_profile_card
    from aiogram.types import BufferedInputFile
    from storage import get_card_cache, set_card_cache

    if viewer:
        stats = viewer.get("statistics", {})
        anime = stats.get("anime", {})
        days = round(anime.get("minutesWatched", 0) / 1440, 1)
        mean = anime.get("meanScore", 0)
        anime_count = anime.get("count", 0)
        name = viewer.get("name", "?")
        lang = get_lang(uid)

        if lang == "ru":
            text = (
                f"*{esc(name)}* — добро пожаловать\\!\n\n"
                f"📺 *{esc(str(anime_count))}* аниме в списке · *{esc(str(days))}* дн\\. просмотрено\n"
                f"⭐ Средняя оценка: *{esc(str(mean))}*\n\n"
                f"Используй кнопки ниже или /help для справки\\."
            )
        else:
            text = (
                f"*{esc(name)}* — welcome back\\!\n\n"
                f"📺 *{esc(str(anime_count))}* anime in list · *{esc(str(days))}* days watched\n"
                f"⭐ Mean score: *{esc(str(mean))}*\n\n"
                f"Use the buttons below or /help for more info\\."
            )

        favs = viewer.get("favourites", {})
        fa = favs.get("anime", {}).get("nodes", [])
        fc = favs.get("characters", {}).get("nodes", [])
        manga = stats.get("manga", {})

        card_data = {
            "username": name,
            "banner_url": viewer.get("bannerImage") or "",
            "avatar_url": (viewer.get("avatar") or {}).get("large") or "",
            "anime_count": anime_count,
            "manga_count": manga.get("count", 0),
            "days_watched": days,
            "mean_score": mean,
            "fav_anime": (fa[0]["title"].get("english") or fa[0]["title"].get("romaji") or "") if fa else "",
            "fav_char": (fc[0]["name"].get("full") or "") if fc else "",
            "fav_anime_covers": [(n.get("coverImage") or {}).get("large") or "" for n in fa[:10]],
            "fav_char_images": [(n.get("image") or {}).get("large") or "" for n in fc[:10]],
            "fav_anime_names": [(n["title"].get("english") or n["title"].get("romaji") or "") for n in fa[:10]],
            "fav_char_names": [(n["name"].get("full") or "") for n in fc[:10]],
        }

        cached_data, cached_file_id = get_card_cache(uid)

        try:
            if cached_file_id:
                await msg.answer_photo(
                    photo=cached_file_id,
                    caption=text,
                    parse_mode="MarkdownV2",
                    reply_markup=main_menu(uid)
                )
                return

            buf = await generate_profile_card(card_data)
            sent = await msg.answer_photo(
                photo=BufferedInputFile(buf.read(), filename="card.png"),
                caption=text,
                parse_mode="MarkdownV2",
                reply_markup=main_menu(uid)
            )
            if sent.photo:
                set_card_cache(uid, card_data, sent.photo[-1].file_id)
            return
        except Exception:
            pass

        await msg.answer(text, parse_mode="MarkdownV2", reply_markup=main_menu(uid))
    else:
        lang = get_lang(uid)
        if lang == "ru":
            text = (
                "*AniList Bot* — твой аниме\\-дневник в Telegram\\.\n\n"
                "Без авторизации доступны поиск, тренды и расписание\\.\n"
                "Авторизуйся в ⚙️ Настройках чтобы управлять списком и получать уведомления\\."
            )
        else:
            text = (
                "*AniList Bot* — your anime diary in Telegram\\.\n\n"
                "Search, trending and schedule are available without login\\.\n"
                "Authorize in ⚙️ Settings to manage your list and get notifications\\."
            )
        try:
            await msg.answer_photo(
                photo=WELCOME_IMAGE,
                caption=text,
                parse_mode="MarkdownV2",
                reply_markup=main_menu(uid)
            )
        except Exception:
            await msg.answer(text, parse_mode="MarkdownV2", reply_markup=main_menu(uid))


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
    from storage import invalidate_card_cache
    invalidate_card_cache(uid)
    await cb.message.answer(t(uid, "logout_done"), parse_mode="MarkdownV2", reply_markup=main_menu(uid))
    await cb.answer()


@router.callback_query(F.data == "myprofile")
async def my_profile_cb(cb: CallbackQuery):
    from handlers.browse import show_profile
    await show_profile(cb, cb.from_user.id)
    await cb.answer()


@router.callback_query(F.data == "settings:clearcache")
async def settings_clearcache_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    lang = get_lang(uid)
    from storage import invalidate_card_cache
    invalidate_card_cache(uid)
    msg = "🗑 Кэш карточки сброшен\\. Следующий /start перегенерирует её\\." if lang == "ru" else "🗑 Card cache cleared\\. Next /start will regenerate it\\."
    await cb.answer(msg if len(msg) <= 200 else msg[:197] + "...", show_alert=True)
    from storage import get_notifications_enabled, set_notifications_enabled
    uid = cb.from_user.id
    lang = get_lang(uid)
    current = get_notifications_enabled(uid)
    set_notifications_enabled(uid, not current)
    try:
        await cb.message.edit_reply_markup(reply_markup=settings_kb(uid))
    except Exception:
        pass
    msg = ("🔔 Уведомления включены" if not current else "🔕 Уведомления выключены") if lang == "ru" else ("🔔 Notifications enabled" if not current else "🔕 Notifications disabled")
    await cb.answer(msg, show_alert=True)