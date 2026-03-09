import io
import time
import hashlib
from aiogram import Router, F, Bot
from aiogram.types import (Message, CallbackQuery, BufferedInputFile,
                            InlineQuery, InlineQueryResultPhoto, InlineQueryResultArticle,
                            InlineQueryResultCachedPhoto, InputTextMessageContent)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from core.api import anilist_query
from core.formatters import esc
from core.image_gen import generate_wrapped, generate_profile_card
from keyboards import btn, main_menu, DEFAULT_LAYOUT, ALL_BUTTONS
from locales.i18n import t
from storage import get_token, get_anilist_id, get_keyboard_layout, set_keyboard_layout, get_lang

router = Router()

Q_STATS = """
query ($userId: Int) {
  User(id: $userId) {
    name bannerImage
    avatar { large }
    statistics {
      anime {
        count meanScore minutesWatched episodesWatched
        genres(sort: COUNT_DESC, limit: 8) { genre count }
      }
      manga { count meanScore chaptersRead }
    }
    favourites {
      anime(perPage: 10) { nodes { id title { romaji english } coverImage { extraLarge large } } }
      characters(perPage: 10) { nodes { id name { full } image { large } } }
    }
  }
}
"""

Q_ACTIVITY = """
query ($userId: Int) {
  Page(page: 1, perPage: 50) {
    activities(userId: $userId, sort: ID_DESC, type: MEDIA_LIST) {
      ... on ListActivity { createdAt status progress }
    }
  }
}
"""

Q_WATCHING_NOW = """
query ($userId: Int) {
  MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
    lists {
      entries {
        progress
        media {
          id title { romaji english }
          episodes averageScore
          coverImage { extraLarge large }
          nextAiringEpisode { episode timeUntilAiring }
        }
      }
    }
  }
}
"""


async def _fetch_stats(uid: int) -> dict | None:
    token = get_token(uid)
    anilist_id = get_anilist_id(uid)
    if not token or not anilist_id:
        return None
    result = await anilist_query(Q_STATS, {"userId": anilist_id}, token=token)
    return result.get("data", {}).get("User")


async def _fetch_activity(uid: int, token: str, anilist_id: int) -> list:
    result = await anilist_query(Q_ACTIVITY, {"userId": anilist_id}, token=token)
    return result.get("data", {}).get("Page", {}).get("activities", [])


def _build_wrapped_data(user: dict, activities: list, year: int = None) -> dict:
    from datetime import datetime
    if year is None:
        year = datetime.now().year
    stats = user.get("statistics", {})
    anime = stats.get("anime", {})
    manga = stats.get("manga", {})
    minutes = anime.get("minutesWatched", 0)
    days = round(minutes / 1440, 1)
    genres = [g["genre"] for g in anime.get("genres", [])[:8]]
    genre_counts = [g["count"] for g in anime.get("genres", [])[:8]]
    favs = user.get("favourites", {})
    fav_nodes = favs.get("anime", {}).get("nodes", [])
    top_anime, top_covers = [], []
    for n in fav_nodes[:5]:
        top_anime.append(n["title"].get("english") or n["title"].get("romaji") or "?")
        cover = (n.get("coverImage") or {}).get("extraLarge") or (n.get("coverImage") or {}).get("large")
        top_covers.append(cover or "")
    monthly = [0] * 12
    list_activity = 0
    for act in activities:
        ts = act.get("createdAt", 0)
        if ts:
            dt = datetime.fromtimestamp(ts)
            if dt.year == year:
                monthly[dt.month - 1] += 1
            list_activity += 1
    return {
        "username": user.get("name", "?"),
        "banner_url": user.get("bannerImage"),
        "avatar_url": (user.get("avatar") or {}).get("large"),
        "anime_count": anime.get("count", 0),
        "manga_count": manga.get("count", 0),
        "days_watched": days,
        "mean_score": anime.get("meanScore", 0),
        "episodes_watched": anime.get("episodesWatched", 0),
        "chapters_read": manga.get("chaptersRead", 0),
        "manga_score": manga.get("meanScore", 0),
        "top_genres": genres,
        "genre_counts": genre_counts,
        "top_anime": top_anime,
        "top_covers": top_covers,
        "monthly_activity": monthly,
        "list_activity": list_activity,
        "year": year,
    }


def _build_card_data(user: dict) -> dict:
    stats = user.get("statistics", {})
    anime = stats.get("anime", {})
    manga = stats.get("manga", {})
    favs = user.get("favourites", {})
    fa = favs.get("anime", {}).get("nodes", [])
    fc = favs.get("characters", {}).get("nodes", [])
    return {
        "username": user.get("name", "?"),
        "banner_url": user.get("bannerImage"),
        "avatar_url": (user.get("avatar") or {}).get("large"),
        "anime_count": anime.get("count", 0),
        "manga_count": manga.get("count", 0),
        "days_watched": round(anime.get("minutesWatched", 0) / 1440, 1),
        "mean_score": anime.get("meanScore", 0),
        "fav_anime": (fa[0]["title"].get("english") or fa[0]["title"].get("romaji") or "") if fa else "",
        "fav_char": (fc[0]["name"].get("full") or "") if fc else "",
        "fav_anime_covers": [(n.get("coverImage") or {}).get("large") or "" for n in fa],
        "fav_anime_names": [(n["title"].get("english") or n["title"].get("romaji") or "") for n in fa],
        "fav_char_images": [(n.get("image") or {}).get("large") or "" for n in fc],
        "fav_char_names": [(n["name"].get("full") or "") for n in fc],
    }


# ─── WRAPPED ──────────────────────────────────────────────────────────────────

async def _send_wrapped(target, uid: int, year: int = None):
    from datetime import datetime
    token = get_token(uid)
    anilist_id = get_anilist_id(uid)
    if not token or not anilist_id:
        dest = target.message if isinstance(target, CallbackQuery) else target
        await dest.answer(t(uid, "mylist_need_auth"), parse_mode="MarkdownV2")
        return
    if year is None:
        year = datetime.now().year
    dest = target.message if isinstance(target, CallbackQuery) else target
    wait = await dest.answer(t(uid, "generating"))
    user = await _fetch_stats(uid)
    activities = await _fetch_activity(uid, token, anilist_id)
    if not user:
        await wait.edit_text(t(uid, "gen_error"))
        return
    data = _build_wrapped_data(user, activities, year=year)
    buf = await generate_wrapped(data)
    await wait.delete()
    await dest.answer_photo(
        photo=BufferedInputFile(buf.read(), filename="wrapped.png"),
        caption=f"🎉 *{esc(data['username'])}* — AniList Wrapped {year}",
        parse_mode="MarkdownV2"
    )


def _wrapped_year_kb(uid: int) -> object:
    from datetime import datetime
    from aiogram.utils.keyboard import InlineKeyboardBuilder
    current_year = datetime.now().year
    b = InlineKeyboardBuilder()
    for y in range(current_year, current_year - 5, -1):
        b.add(btn(str(y), f"wrapped_year:{y}"))
    b.adjust(3)
    return b.as_markup()


@router.callback_query(F.data == "wrapped")
async def wrapped_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    lang = get_lang(uid)
    text = t(uid, "wrapped_year_select")
    await cb.message.answer(text, parse_mode="MarkdownV2", reply_markup=_wrapped_year_kb(uid))
    await cb.answer()


@router.callback_query(F.data.startswith("wrapped_year:"))
async def wrapped_year_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    year = int(cb.data.split(":")[1])
    await cb.answer()
    await _send_wrapped(cb, uid, year=year)


@router.message(F.text.in_({"📊 Wrapped", "📊 Статистика", "/wrapped"}))
async def wrapped_msg(msg: Message):
    uid = msg.from_user.id
    text = t(uid, "wrapped_year_select")
    await msg.answer(text, parse_mode="MarkdownV2", reply_markup=_wrapped_year_kb(uid))


# ─── PROFILE CARD ─────────────────────────────────────────────────────────────

async def _send_card(target, uid: int):
    token = get_token(uid)
    if not token:
        dest = target.message if isinstance(target, CallbackQuery) else target
        await dest.answer(t(uid, "mylist_need_auth"), parse_mode="MarkdownV2")
        return
    dest = target.message if isinstance(target, CallbackQuery) else target
    wait = await dest.answer(t(uid, "generating"))
    user = await _fetch_stats(uid)
    if not user:
        await wait.edit_text(t(uid, "gen_error"))
        return
    data = _build_card_data(user)
    buf = await generate_profile_card(data)
    await wait.delete()
    await dest.answer_photo(
        photo=BufferedInputFile(buf.read(), filename="card.png"),
        caption=f"🪪 *{esc(data['username'])}*",
        parse_mode="MarkdownV2"
    )


@router.callback_query(F.data == "profile_card")
async def profile_card_cb(cb: CallbackQuery):
    await cb.answer()
    await _send_card(cb, cb.from_user.id)


@router.message(F.text == "/card")
async def card_msg(msg: Message):
    await _send_card(msg, msg.from_user.id)


# ─── INLINE: NOW WATCHING ─────────────────────────────────────────────────────

@router.inline_query(F.query.lower().startswith("watching"))
async def inline_now_watching(query: InlineQuery):
    uid = query.from_user.id
    token = get_token(uid)
    anilist_id = get_anilist_id(uid)
    lang = get_lang(uid)

    if not token or not anilist_id:
        pm = "🔐 Войти в AniList" if lang == "ru" else "🔐 Login to AniList first"
        await query.answer([], switch_pm_text=pm, switch_pm_parameter="start", cache_time=1)
        return

    result = await anilist_query(Q_WATCHING_NOW, {"userId": anilist_id}, token=token)
    lists = result.get("data", {}).get("MediaListCollection", {}).get("lists", [])
    entries = [e for lst in lists for e in lst.get("entries", [])]
    entries.sort(key=lambda e: (e.get("media") or {}).get("nextAiringEpisode") is not None, reverse=True)

    results = []
    for e in entries[:15]:
        media = e.get("media") or {}
        title_obj = media.get("title", {})
        title = title_obj.get("english") or title_obj.get("romaji") or "?"
        progress = e.get("progress", 0)
        total = media.get("episodes") or "?"
        score = media.get("averageScore") or 0
        nep = media.get("nextAiringEpisode")
        cover = (media.get("coverImage") or {}).get("extraLarge") or (media.get("coverImage") or {}).get("large")
        media_id = media.get("id")

        next_str = ""
        if nep:
            h = nep["timeUntilAiring"] // 3600
            ep_n = nep["episode"]
            if lang == "ru":
                next_str = "\n\u23f0 \u042d\u043f\\. " + str(ep_n) + " \u0447\u0435\u0440\u0435\u0437 " + str(h) + "\u0447"
            else:
                next_str = "\n\u23f0 Ep\\. " + str(ep_n) + " in " + str(h) + "h"

        t_total = esc(str(total))
        t_title = esc(title)
        score_str = " \\| \u2b50" + str(score) if score else ""
        via = "_via @westyasha\\_AniList\\_bot_"

        if lang == "ru":
            text = (
                "\U0001f440 *\u0421\u0435\u0439\u0447\u0430\u0441 \u0441\u043c\u043e\u0442\u0440\u044e:* [" + t_title + "](https://anilist\\.co/anime/" + str(media_id) + ")\n"
                "\U0001f4fa \u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441: " + str(progress) + "/" + t_total + score_str + next_str + "\n\n" + via
            )
        else:
            text = (
                "\U0001f440 *Now watching:* [" + t_title + "](https://anilist\\.co/anime/" + str(media_id) + ")\n"
                "\U0001f4fa Progress: " + str(progress) + "/" + t_total + score_str + next_str + "\n\n" + via
            )

        uid_hash = hashlib.md5(f"nw{media_id}".encode()).hexdigest()
        desc = ("Прогресс" if lang == "ru" else "Progress") + f": {progress}/{total}" + (f" • {score}" if score else "")

        if cover:
            results.append(InlineQueryResultPhoto(
                id=uid_hash, photo_url=cover, thumbnail_url=cover,
                title=f"👀 {title}", description=desc,
                caption=text, parse_mode="MarkdownV2",
            ))
        else:
            results.append(InlineQueryResultArticle(
                id=uid_hash, title=f"👀 {title}", description=desc,
                input_message_content=InputTextMessageContent(message_text=text, parse_mode="MarkdownV2")
            ))

    if not results:
        pm = "📋 Список пуст" if lang == "ru" else "📋 Watching list is empty"
        await query.answer([], switch_pm_text=pm, switch_pm_parameter="start", cache_time=10)
        return
    await query.answer(results, cache_time=60)


# ─── INLINE: PROFILE CARD ─────────────────────────────────────────────────────

_card_cache: dict[int, tuple[str, float]] = {}
_CARD_CACHE_TTL = 3600


@router.inline_query(F.query.lower().startswith("card"))
async def inline_profile_card(query: InlineQuery):
    uid = query.from_user.id
    token = get_token(uid)
    lang = get_lang(uid)

    if not token:
        pm = "🔐 Нужна авторизация" if lang == "ru" else "🔐 Login to use this feature"
        await query.answer([], switch_pm_text=pm, switch_pm_parameter="start", cache_time=1)
        return

    user = await _fetch_stats(uid)
    if not user:
        pm = "❌ Ошибка загрузки" if lang == "ru" else "❌ Failed to load profile"
        await query.answer([], switch_pm_text=pm, switch_pm_parameter="start", cache_time=5)
        return

    data = _build_card_data(user)
    uid_hash = hashlib.md5(f"card{uid}".encode()).hexdigest()
    ms = esc(str(data["mean_score"]))
    dw = esc(str(data["days_watched"]))
    uname = esc(data["username"])

    if lang == "ru":
        caption = (
            "\U0001faa6 *" + uname + "*\n"
            "\U0001f4fa " + str(data["anime_count"]) + " аниме \\| \U0001f4d6 " + str(data["manga_count"]) + " манги\n"
            "\u2b50 Средняя оценка: " + ms + " \\| \u23f1 " + dw + " дней\n\n"
            "_via @westyasha\\_AniList\\_bot_"
        )
        title_str = "🪪 Профиль " + data["username"]
        desc_str = "📺 " + str(data["anime_count"]) + " аниме • ⭐ " + str(data["mean_score"])
    else:
        caption = (
            "\U0001faa6 *" + uname + "*\n"
            "\U0001f4fa " + str(data["anime_count"]) + " anime \\| \U0001f4d6 " + str(data["manga_count"]) + " manga\n"
            "\u2b50 Mean score: " + ms + " \\| \u23f1 " + dw + " days\n\n"
            "_via @westyasha\\_AniList\\_bot_"
        )
        title_str = "🪪 " + data["username"] + "'s Profile"
        desc_str = "📺 " + str(data["anime_count"]) + " anime • ⭐ " + str(data["mean_score"])

    cached = _card_cache.get(uid)
    file_id = cached[0] if cached and (time.time() - cached[1]) < _CARD_CACHE_TTL else None

    if not file_id:
        buf = await generate_profile_card(data)
        bot: Bot = query.bot
        try:
            sent = await bot.send_photo(
                chat_id=uid,
                photo=BufferedInputFile(buf.read(), filename="card.png"),
                caption=caption,
                parse_mode="MarkdownV2",
            )
            file_id = sent.photo[-1].file_id
            _card_cache[uid] = (file_id, time.time())
            await sent.delete()
        except Exception:
            file_id = None

    if file_id:
        results = [InlineQueryResultCachedPhoto(
            id=uid_hash, photo_file_id=file_id,
            title=title_str, description=desc_str,
            caption=caption, parse_mode="MarkdownV2",
        )]
    else:
        avatar_url = data.get("avatar_url") or ""
        if avatar_url:
            results = [InlineQueryResultPhoto(
                id=uid_hash, photo_url=avatar_url, thumbnail_url=avatar_url,
                title=title_str, description=desc_str,
                caption=caption, parse_mode="MarkdownV2",
            )]
        else:
            results = [InlineQueryResultArticle(
                id=uid_hash, title=title_str, description=desc_str,
                input_message_content=InputTextMessageContent(message_text=caption, parse_mode="MarkdownV2")
            )]

    await query.answer(results, cache_time=300)


# ─── KEYBOARD CUSTOMIZER ──────────────────────────────────────────────────────

_kb_temp: dict[int, list] = {}


@router.callback_query(F.data == "customize_keyboard")
async def customize_keyboard_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    layout = get_keyboard_layout(uid) or [row[:] for row in DEFAULT_LAYOUT]
    _kb_temp[uid] = [row[:] for row in layout]
    await cb.message.edit_text(t(uid, "kb_title"), parse_mode="MarkdownV2", reply_markup=_customizer_kb(uid))
    await cb.answer()


def _customizer_kb(uid: int):
    layout = _kb_temp.get(uid) or get_keyboard_layout(uid) or DEFAULT_LAYOUT
    active_keys = {k for row in layout for k in row}
    b = InlineKeyboardBuilder()
    for key in ALL_BUTTONS:
        mark = "✅ " if key in active_keys else "☐ "
        b.add(btn(f"{mark}{t(uid, key)}", f"kb_toggle:{key}"))
    b.add(btn(t(uid, "kb_save_btn"), "kb_save", "success"))
    b.add(btn(t(uid, "kb_reset_btn"), "kb_reset", "danger"))
    b.adjust(2, 2, 2, 1, 2)
    return b.as_markup()


@router.callback_query(F.data.startswith("kb_toggle:"))
async def kb_toggle_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    key = cb.data.split(":")[1]
    if uid not in _kb_temp:
        layout = get_keyboard_layout(uid) or [row[:] for row in DEFAULT_LAYOUT]
        _kb_temp[uid] = [row[:] for row in layout]
    layout = _kb_temp[uid]
    flat = [k for row in layout for k in row]
    if key in flat:
        _kb_temp[uid] = [row for row in [[k for k in r if k != key] for r in layout] if row]
    else:
        if _kb_temp[uid] and len(_kb_temp[uid][-1]) < 2:
            _kb_temp[uid][-1].append(key)
        else:
            _kb_temp[uid].append([key])
    try:
        await cb.message.edit_reply_markup(reply_markup=_customizer_kb(uid))
    except Exception:
        pass
    await cb.answer()


@router.callback_query(F.data == "kb_save")
async def kb_save_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    layout = _kb_temp.pop(uid, None)
    if not layout:
        await cb.answer("No changes", show_alert=True)
        return
    set_keyboard_layout(uid, layout)
    await cb.answer("✅", show_alert=False)
    await cb.message.delete()
    await cb.message.answer(t(uid, "kb_saved"), parse_mode="MarkdownV2", reply_markup=main_menu(uid))


@router.callback_query(F.data == "kb_reset")
async def kb_reset_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    set_keyboard_layout(uid, [row[:] for row in DEFAULT_LAYOUT])
    _kb_temp.pop(uid, None)
    await cb.answer("🔄", show_alert=False)
    await cb.message.delete()
    await cb.message.answer(t(uid, "kb_reset_done"), parse_mode="MarkdownV2", reply_markup=main_menu(uid))
