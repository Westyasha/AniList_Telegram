import io
import hashlib
from aiogram import Router, F
from aiogram.types import (Message, CallbackQuery, BufferedInputFile,
                            InlineQuery, InlineQueryResultPhoto, InlineQueryResultArticle,
                            InputTextMessageContent)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from core.api import anilist_query
from core.formatters import esc
from core.image_gen import generate_wrapped, generate_profile_card
from keyboards import btn, main_menu, keyboard_customizer_kb, DEFAULT_LAYOUT, ALL_BUTTONS
from locales.i18n import t
from storage import get_token, get_anilist_id, get_keyboard_layout, set_keyboard_layout

router = Router()

Q_STATS = """
query ($userId: Int) {
  User(id: $userId) {
    name
    bannerImage
    avatar { large }
    statistics {
      anime {
        count
        meanScore
        minutesWatched
        episodesWatched
        statuses(sort: COUNT_DESC) { status count }
        genres(sort: COUNT_DESC, limit: 8) { genre count }
      }
      manga {
        count
        meanScore
        chaptersRead
      }
    }
    favourites {
      anime(perPage: 5) { nodes { id title { romaji english } coverImage { extraLarge large } } }
      characters(perPage: 3) { nodes { id name { full } } }
    }
  }
}
"""

Q_ACTIVITY = """
query ($userId: Int) {
  Page(page: 1, perPage: 50) {
    activities(userId: $userId, sort: ID_DESC, type: MEDIA_LIST) {
      ... on ListActivity {
        createdAt
        status
        progress
      }
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
          id
          title { romaji english }
          episodes
          averageScore
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


def _build_wrapped_data(user: dict, activities: list) -> dict:
    stats = user.get("statistics", {})
    anime = stats.get("anime", {})
    manga = stats.get("manga", {})

    minutes = anime.get("minutesWatched", 0)
    days = round(minutes / 1440, 1)

    genres = [g["genre"] for g in anime.get("genres", [])[:8]]
    genre_counts = [g["count"] for g in anime.get("genres", [])[:8]]

    favs = user.get("favourites", {})
    fav_nodes = favs.get("anime", {}).get("nodes", [])
    top_anime = []
    top_covers = []
    for n in fav_nodes[:5]:
        title = n["title"].get("english") or n["title"].get("romaji") or "?"
        top_anime.append(title)
        cover = (n.get("coverImage") or {}).get("extraLarge") or (n.get("coverImage") or {}).get("large")
        top_covers.append(cover or "")

    # monthly activity from activities list
    from datetime import datetime
    monthly = [0] * 12
    list_activity = 0
    for act in activities:
        ts = act.get("createdAt", 0)
        if ts:
            dt = datetime.fromtimestamp(ts)
            if dt.year == 2025:
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
        "top_genres": genres,
        "genre_counts": genre_counts,
        "top_anime": top_anime,
        "top_covers": top_covers,
        "monthly_activity": monthly,
        "days_active": "?/365",
        "most_active_day": "N/A",
        "list_activity": list_activity,
    }


def _build_card_data(user: dict) -> dict:
    stats = user.get("statistics", {})
    anime = stats.get("anime", {})
    manga = stats.get("manga", {})
    favs = user.get("favourites", {})

    fav_anime = ""
    fa = favs.get("anime", {}).get("nodes", [])
    if fa:
        fav_anime = fa[0]["title"].get("english") or fa[0]["title"].get("romaji") or ""

    fav_char = ""
    fc = favs.get("characters", {}).get("nodes", [])
    if fc:
        fav_char = fc[0]["name"].get("full") or ""

    return {
        "username": user.get("name", "?"),
        "banner_url": user.get("bannerImage"),
        "avatar_url": (user.get("avatar") or {}).get("large"),
        "anime_count": anime.get("count", 0),
        "manga_count": manga.get("count", 0),
        "days_watched": round(anime.get("minutesWatched", 0) / 1440, 1),
        "mean_score": anime.get("meanScore", 0),
        "fav_anime": fav_anime,
        "fav_char": fav_char,
    }


# ─── WRAPPED ──────────────────────────────────────────────────────────────────

async def _send_wrapped(target, uid: int):
    token = get_token(uid)
    anilist_id = get_anilist_id(uid)
    if not token or not anilist_id:
        dest = target.message if isinstance(target, CallbackQuery) else target
        await dest.answer(t(uid, "mylist_need_auth"), parse_mode="MarkdownV2")
        return
    dest = target.message if isinstance(target, CallbackQuery) else target
    wait = await dest.answer(t(uid, "generating"))
    user = await _fetch_stats(uid)
    activities = await _fetch_activity(uid, token, anilist_id)
    if not user:
        await wait.edit_text(t(uid, "gen_error"))
        return
    data = _build_wrapped_data(user, activities)
    buf = await generate_wrapped(data)
    await wait.delete()
    await dest.answer_photo(
        photo=BufferedInputFile(buf.read(), filename="wrapped.png"),
        caption=f"🎉 *{esc(data['username'])}* — AniList Wrapped 2025",
        parse_mode="MarkdownV2"
    )


@router.callback_query(F.data == "wrapped")
async def wrapped_cb(cb: CallbackQuery):
    await cb.answer()
    await _send_wrapped(cb, cb.from_user.id)


@router.message(F.text.in_({"📊 Wrapped", "📊 Статистика", "/wrapped"}))
async def wrapped_msg(msg: Message):
    await _send_wrapped(msg, msg.from_user.id)


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

    if not token or not anilist_id:
        await query.answer(
            [], switch_pm_text="🔐 Войти в AniList" if get_lang(uid)=="ru" else "🔐 Login to AniList first",
            switch_pm_parameter="start", cache_time=1
        )
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
            next_str = f"\n⏰ Ep\\.{nep['episode']} in {h}h"

        text = (
            f"👀 *Now watching:* [{esc(title)}](https://anilist\\.co/anime/{media_id})\n"
            f"📺 Progress: {progress}/{total}"
            + (f" \\| ⭐{score}" if score else "")
            + next_str
            + f"\n\n_via @westyasha\\_AniList\\_bot_"
        )

        uid_hash = hashlib.md5(f"nw{media_id}".encode()).hexdigest()

        thumb = cover or ""
        if cover:
            results.append(InlineQueryResultPhoto(
                id=uid_hash, photo_url=cover, thumbnail_url=thumb,
                title=f"👀 {title}",
                description=f"Progress: {progress}/{total}" + (f" • ⭐{score}" if score else ""),
                caption=text,
                parse_mode="MarkdownV2",
            ))
        else:
            results.append(InlineQueryResultArticle(
                id=uid_hash, title=f"👀 {title}",
                description=f"Progress: {progress}/{total}",
                input_message_content=InputTextMessageContent(message_text=text, parse_mode="MarkdownV2")
            ))

    if not results:
        await query.answer([], switch_pm_text="📋 Список пуст" if get_lang(uid)=="ru" else "📋 Watching list is empty",
                           switch_pm_parameter="start", cache_time=10)
        return
    await query.answer(results, cache_time=60)


# ─── INLINE: PROFILE CARD ─────────────────────────────────────────────────────

@router.inline_query(F.query.lower().startswith("card"))
async def inline_profile_card(query: InlineQuery):
    uid = query.from_user.id
    token = get_token(uid)

    if not token:
        await query.answer(
            [], switch_pm_text="🔐 Нужна авторизация" if get_lang(uid)=="ru" else "🔐 Login to use this feature",
            switch_pm_parameter="start", cache_time=1
        )
        return

    user = await _fetch_stats(uid)
    if not user:
        await query.answer([], switch_pm_text="❌ Ошибка загрузки" if get_lang(uid)=="ru" else "❌ Failed to load profile",
                           switch_pm_parameter="start", cache_time=5)
        return

    from storage import get_lang
    lang = get_lang(uid)
    data = _build_card_data(user)
    uid_hash = hashlib.md5(f"card{uid}".encode()).hexdigest()

    if lang == "ru":
        text = (
            f"🪪 *{esc(data['username'])}*\n"
            f"📺 {data['anime_count']} аниме \\| 📖 {data['manga_count']} манги\n"
            f"⭐ Средняя оценка: {data['mean_score']} \\| ⏱ {data['days_watched']} дней\n"
            f"\n_via @westyasha\\_AniList\\_bot_"
        )
        title_str = f"🪪 Профиль {data['username']}"
        desc_str = f"📺 {data['anime_count']} аниме • ⭐ {data['mean_score']}"
    else:
        text = (
            f"🪪 *{esc(data['username'])}*\n"
            f"📺 {data['anime_count']} anime \\| 📖 {data['manga_count']} manga\n"
            f"⭐ Mean score: {data['mean_score']} \\| ⏱ {data['days_watched']} days\n"
            f"\n_via @westyasha\\_AniList\\_bot_"
        )
        title_str = f"🪪 {data['username']}'s Profile"
        desc_str = f"📺 {data['anime_count']} anime • ⭐ {data['mean_score']}"

    avatar_url = data.get("avatar_url") or ""
    if avatar_url:
        results = [InlineQueryResultPhoto(
            id=uid_hash, photo_url=avatar_url, thumbnail_url=avatar_url,
            title=title_str, description=desc_str,
            caption=text, parse_mode="MarkdownV2",
        )]
    else:
        results = [InlineQueryResultArticle(
            id=uid_hash, title=title_str, description=desc_str,
            input_message_content=InputTextMessageContent(message_text=text, parse_mode="MarkdownV2")
        )]

    await query.answer(results, cache_time=120)


# ─── KEYBOARD CUSTOMIZER ──────────────────────────────────────────────────────

_kb_temp: dict[int, list] = {}


@router.callback_query(F.data == "customize_keyboard")
async def customize_keyboard_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    layout = get_keyboard_layout(uid) or [row[:] for row in DEFAULT_LAYOUT]
    _kb_temp[uid] = [row[:] for row in layout]
    await cb.message.edit_text(
        t(uid, "kb_title"),
        parse_mode="MarkdownV2",
        reply_markup=_customizer_kb(uid)
    )
    await cb.answer()


def _customizer_kb(uid: int):
    layout = _kb_temp.get(uid) or get_keyboard_layout(uid) or DEFAULT_LAYOUT
    active_keys = {k for row in layout for k in row}
    b = InlineKeyboardBuilder()
    for key in ALL_BUTTONS:
        label_text = t(uid, key)
        mark = "✅ " if key in active_keys else "☐ "
        b.add(btn(f"{mark}{label_text}", f"kb_toggle:{key}"))
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
        _kb_temp[uid] = [[k for k in row if k != key] for row in layout]
        _kb_temp[uid] = [row for row in _kb_temp[uid] if row]
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
    await cb.answer("✅ Keyboard saved!", show_alert=True)
    await cb.message.delete()
    await cb.message.answer(t(uid, "kb_saved"), parse_mode="MarkdownV2", reply_markup=main_menu(uid))


@router.callback_query(F.data == "kb_reset")
async def kb_reset_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    set_keyboard_layout(uid, [row[:] for row in DEFAULT_LAYOUT])
    _kb_temp.pop(uid, None)
    await cb.answer("🔄 Reset to default", show_alert=True)
    await cb.message.delete()
    await cb.message.answer(t(uid, "kb_reset_done"), parse_mode="MarkdownV2", reply_markup=main_menu(uid))
