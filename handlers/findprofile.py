from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, BufferedInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from core.api import anilist_query
from core.formatters import esc
from core.image_gen import generate_profile_card
from keyboards import btn
from locales.i18n import t
from storage import get_lang, get_token

router = Router()

Q_USER_BY_NAME = """
query ($name: String) {
  User(name: $name) {
    id name siteUrl bannerImage
    avatar { large }
    statistics {
      anime { count meanScore minutesWatched episodesWatched }
      manga { count meanScore chaptersRead }
    }
    favourites {
      anime(perPage: 25) {
        nodes { id title { romaji english } coverImage { extraLarge large } }
      }
      characters(perPage: 25) {
        nodes { id name { full } image { large } }
      }
    }
  }
}
"""


class FindProfileState(StatesGroup):
    waiting_username = State()


def _build_card_data(user: dict) -> dict:
    stats = user.get("statistics", {})
    anime = stats.get("anime", {})
    manga = stats.get("manga", {})
    favs = user.get("favourites", {})
    fa = favs.get("anime", {}).get("nodes", [])
    fc = favs.get("characters", {}).get("nodes", [])
    return {
        "username": user.get("name", "?"),
        "banner_url": user.get("bannerImage") or "",
        "avatar_url": (user.get("avatar") or {}).get("large") or "",
        "anime_count": anime.get("count", 0),
        "manga_count": manga.get("count", 0),
        "days_watched": round(anime.get("minutesWatched", 0) / 1440, 1),
        "mean_score": anime.get("meanScore", 0),
        "fav_anime": (fa[0]["title"].get("english") or fa[0]["title"].get("romaji") or "") if fa else "",
        "fav_char": (fc[0]["name"].get("full") or "") if fc else "",
        "fav_anime_covers": [(n.get("coverImage") or {}).get("extraLarge") or (n.get("coverImage") or {}).get("large") or "" for n in fa[:25]],
        "fav_anime_names": [(n["title"].get("english") or n["title"].get("romaji") or "") for n in fa[:25]],
        "fav_char_images": [(n.get("image") or {}).get("large") or "" for n in fc[:25]],
        "fav_char_names": [(n["name"].get("full") or "") for n in fc[:25]],
    }


def _profile_kb(uid: int, anilist_id: int, anilist_url: str) -> object:
    from aiogram.types import InlineKeyboardButton
    lang = get_lang(uid)
    b = InlineKeyboardBuilder()
    b.add(btn("🔍 Полный профиль" if lang == "ru" else "🔍 Full profile", f"findprofile_full:{anilist_id}"))
    b.add(InlineKeyboardButton(text="🌐 AniList", url=anilist_url))
    b.adjust(2)
    return b.as_markup()


async def _render_and_send(target, uid: int, user: dict):
    lang = get_lang(uid)
    card_data = _build_card_data(user)
    name = user.get("name", "?")
    stats = user.get("statistics", {})
    anime = stats.get("anime", {})
    manga = stats.get("manga", {})
    days = round(anime.get("minutesWatched", 0) / 1440, 1)
    mean = anime.get("meanScore", 0)
    anime_count = anime.get("count", 0)
    manga_count = manga.get("count", 0)
    site_url = user.get("siteUrl") or f"https://anilist.co/user/{name}"
    anilist_id = user.get("id")

    if lang == "ru":
        caption = (
            f"👤 *{esc(name)}*\n\n"
            f"📺 *{esc(str(anime_count))}* аниме · *{esc(str(days))}* дн\\.\n"
            f"📖 *{esc(str(manga_count))}* манга\n"
            f"⭐ Средняя оценка: *{esc(str(mean))}*"
        )
    else:
        caption = (
            f"👤 *{esc(name)}*\n\n"
            f"📺 *{esc(str(anime_count))}* anime · *{esc(str(days))}* days\n"
            f"📖 *{esc(str(manga_count))}* manga\n"
            f"⭐ Mean score: *{esc(str(mean))}*"
        )

    dest = target.message if isinstance(target, CallbackQuery) else target

    wait_msg = await dest.answer("⏳ Генерирую карточку..." if lang == "ru" else "⏳ Generating card...")
    try:
        buf = await generate_profile_card(card_data)
        await wait_msg.delete()
        await dest.answer_photo(
            photo=BufferedInputFile(buf.read(), filename="profile.png"),
            caption=caption,
            parse_mode="MarkdownV2",
            reply_markup=_profile_kb(uid, anilist_id, site_url)
        )
    except Exception:
        await wait_msg.edit_text(caption, parse_mode="MarkdownV2",
                                 reply_markup=_profile_kb(uid, anilist_id, site_url))


@router.message(F.text.lower().startswith("/findprofile"))
async def cmd_findprofile(msg: Message, state: FSMContext):
    uid = msg.from_user.id
    lang = get_lang(uid)
    parts = msg.text.strip().split(maxsplit=1)
    if len(parts) > 1:
        username = parts[1].strip()
        await _search_and_render(msg, uid, username)
    else:
        prompt = "🔍 Введи ник пользователя на AniList:" if lang == "ru" else "🔍 Enter AniList username:"
        await msg.answer(prompt)
        await state.set_state(FindProfileState.waiting_username)


@router.message(FindProfileState.waiting_username)
async def handle_username_input(msg: Message, state: FSMContext):
    uid = msg.from_user.id
    await state.clear()
    username = msg.text.strip()
    await _search_and_render(msg, uid, username)


@router.callback_query(F.data.startswith("findprofile:"))
async def findprofile_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    username = cb.data.split("findprofile:")[1]
    await _search_and_render(cb, uid, username)
    await cb.answer()


@router.callback_query(F.data.startswith("findprofile_full:"))
async def findprofile_full_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    lang = get_lang(uid)
    anilist_id = int(cb.data.split("findprofile_full:")[1])
    token = get_token(uid)

    from core.api import anilist_query as aq
    Q_FULL = """
    query ($id: Int) {
      User(id: $id) {
        name siteUrl
        statistics {
          anime {
            count meanScore minutesWatched episodesWatched
            genres(sort: COUNT_DESC, limit: 5) { genre count }
            statuses { status count }
          }
          manga { count meanScore chaptersRead volumesRead }
        }
      }
    }
    """
    result = await aq(Q_FULL, {"id": anilist_id}, token=token)
    user = result.get("data", {}).get("User")
    if not user:
        await cb.answer("Не удалось загрузить" if lang == "ru" else "Failed to load", show_alert=True)
        return

    stats = user.get("statistics", {})
    anime = stats.get("anime", {})
    manga = stats.get("manga", {})
    name = user.get("name", "?")
    genres = anime.get("genres", [])
    statuses = {s["status"]: s["count"] for s in anime.get("statuses", [])}

    status_map_ru = {"CURRENT": "Смотрю", "COMPLETED": "Просмотрено", "PLANNING": "Запланировано",
                     "PAUSED": "На паузе", "DROPPED": "Брошено"}
    status_map_en = {"CURRENT": "Watching", "COMPLETED": "Completed", "PLANNING": "Planning",
                     "PAUSED": "On hold", "DROPPED": "Dropped"}
    sm = status_map_ru if lang == "ru" else status_map_en

    status_lines = "\n".join(
        f"  {sm.get(k, k)}: *{esc(str(v))}*"
        for k, v in statuses.items() if k in sm
    )
    genre_lines = " \\| ".join(esc(g["genre"]) for g in genres[:5])

    days = round(anime.get("minutesWatched", 0) / 1440, 1)
    if lang == "ru":
        text = (
            f"📊 *Подробный профиль — {esc(name)}*\n\n"
            f"*Аниме:* {esc(str(anime.get('count', 0)))} тайтлов · {esc(str(days))} дн\\.\n"
            f"*Эпизодов:* {esc(str(anime.get('episodesWatched', 0)))}\n"
            f"*Оценка:* {esc(str(anime.get('meanScore', 0)))}\n\n"
            f"*По статусам:*\n{status_lines}\n\n"
            f"*Топ жанры:* {genre_lines}\n\n"
            f"*Манга:* {esc(str(manga.get('count', 0)))} тайтлов · "
            f"{esc(str(manga.get('chaptersRead', 0)))} глав"
        )
    else:
        text = (
            f"📊 *Full profile — {esc(name)}*\n\n"
            f"*Anime:* {esc(str(anime.get('count', 0)))} titles · {esc(str(days))} days\n"
            f"*Episodes:* {esc(str(anime.get('episodesWatched', 0)))}\n"
            f"*Score:* {esc(str(anime.get('meanScore', 0)))}\n\n"
            f"*By status:*\n{status_lines}\n\n"
            f"*Top genres:* {genre_lines}\n\n"
            f"*Manga:* {esc(str(manga.get('count', 0)))} titles · "
            f"{esc(str(manga.get('chaptersRead', 0)))} chapters"
        )

    from aiogram.types import InlineKeyboardButton
    b = InlineKeyboardBuilder()
    b.add(InlineKeyboardButton(text="🌐 AniList", url=user.get("siteUrl") or f"https://anilist.co/user/{name}"))
    await cb.message.answer(text, parse_mode="MarkdownV2", reply_markup=b.as_markup())
    await cb.answer()


async def _search_and_render(target, uid: int, username: str):
    lang = get_lang(uid)
    token = get_token(uid)
    dest = target.message if isinstance(target, CallbackQuery) else target

    result = await anilist_query(Q_USER_BY_NAME, {"name": username}, token=token)
    user = result.get("data", {}).get("User")

    if not user:
        not_found = f"❌ Пользователь *{esc(username)}* не найден на AniList\\." if lang == "ru" \
            else f"❌ User *{esc(username)}* not found on AniList\\."
        await dest.answer(not_found, parse_mode="MarkdownV2")
        return

    await _render_and_send(target, uid, user)
