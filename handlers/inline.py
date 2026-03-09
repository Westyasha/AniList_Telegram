from aiogram import Router, F
from aiogram.types import (InlineQuery, InlineQueryResultArticle,
                            InputTextMessageContent, InlineQueryResultPhoto)
import hashlib
from core.api import anilist_query, Q_SEARCH_MEDIA
from core.formatters import esc
from storage import get_token, get_lang

router = Router()

# "watching" and "card" prefixes are handled in profile_extra.router (registered before this)

def _menu_results(uid: int) -> list:
    lang = get_lang(uid)
    has_token = bool(get_token(uid))

    if lang == "ru":
        items = [
            {
                "id": "menu_watching",
                "title": "👀  Сейчас смотрю",
                "description": "Поделиться тем, что смотришь сейчас • Напиши: watching" if has_token else "⚠️ Нужна авторизация • Открой бот",
                "thumb": "https://img.icons8.com/fluency/96/tv-show.png",
                "text": "Напиши *watching* после @westyasha\\_AniList\\_bot чтобы поделиться списком\\.",
            },
            {
                "id": "menu_card",
                "title": "🪪  Визитка профиля",
                "description": "Поделиться карточкой профиля • Напиши: card" if has_token else "⚠️ Нужна авторизация • Открой бот",
                "thumb": "https://img.icons8.com/fluency/96/person-male.png",
                "text": "Напиши *card* после @westyasha\\_AniList\\_bot чтобы поделиться профилем\\.",
            },
            {
                "id": "menu_search",
                "title": "🔍  Поиск аниме",
                "description": "Найти и поделиться аниме • Напиши название",
                "thumb": "https://img.icons8.com/fluency/96/search.png",
                "text": "Напиши *название аниме* после @westyasha\\_AniList\\_bot для поиска\\.",
            },
        ]
    else:
        items = [
            {
                "id": "menu_watching",
                "title": "👀  Now Watching",
                "description": "Share what you're watching right now • Type: watching" if has_token else "⚠️ Login required • Open the bot",
                "thumb": "https://img.icons8.com/fluency/96/tv-show.png",
                "text": "Type *watching* after @westyasha\\_AniList\\_bot to share your watching list\\.",
            },
            {
                "id": "menu_card",
                "title": "🪪  Profile Card",
                "description": "Share your AniList profile card • Type: card" if has_token else "⚠️ Login required • Open the bot",
                "thumb": "https://img.icons8.com/fluency/96/person-male.png",
                "text": "Type *card* after @westyasha\\_AniList\\_bot to share your profile card\\.",
            },
            {
                "id": "menu_search",
                "title": "🔍  Search Anime",
                "description": "Find and share any anime • Type anime name",
                "thumb": "https://img.icons8.com/fluency/96/search.png",
                "text": "Type an *anime name* after @westyasha\\_AniList\\_bot to search\\.",
            },
        ]

    return [
        InlineQueryResultArticle(
            id=item["id"],
            title=item["title"],
            description=item["description"],
            thumbnail_url=item["thumb"],
            thumbnail_width=96,
            thumbnail_height=96,
            input_message_content=InputTextMessageContent(
                message_text=item["text"],
                parse_mode="MarkdownV2"
            )
        )
        for item in items
    ]


@router.inline_query()
async def inline_handler(query: InlineQuery):
    q = query.query.strip()
    q_lower = q.lower()
    uid = query.from_user.id
    lang = get_lang(uid)

    # Handled by profile_extra.router
    if q_lower.startswith("watching") or q_lower.startswith("card"):
        return

    # Empty → show menu
    if not q:
        await query.answer(_menu_results(uid), cache_time=10, is_personal=True)
        return

    if len(q) < 2:
        await query.answer([], cache_time=1)
        return

    result = await anilist_query(Q_SEARCH_MEDIA, {"search": q, "type": "ANIME", "page": 1, "perPage": 10})
    items = result.get("data", {}).get("Page", {}).get("media", [])

    status_map_ru = {
        "FINISHED": "✅ Завершён", "RELEASING": "▶️ Онгоинг",
        "NOT_YET_RELEASED": "📅 Анонс", "CANCELLED": "❌ Отменён"
    }
    status_map_en = {
        "FINISHED": "✅ Finished", "RELEASING": "▶️ Airing",
        "NOT_YET_RELEASED": "📅 Upcoming", "CANCELLED": "❌ Cancelled"
    }
    status_map = status_map_ru if lang == "ru" else status_map_en

    results = []
    for item in items:
        title_obj = item.get("title", {})
        title = title_obj.get("english") or title_obj.get("romaji") or "?"
        title_native = title_obj.get("native") or ""
        score = item.get("averageScore") or 0
        genres = ", ".join(item.get("genres", [])[:4])
        episodes = item.get("episodes") or "?"
        status = item.get("status") or ""
        fmt = item.get("format") or ""
        year = (item.get("startDate") or {}).get("year") or ""
        cover = (item.get("coverImage") or {}).get("extraLarge") or (item.get("coverImage") or {}).get("large") or ""
        desc_raw = (item.get("description") or "").replace("<br>", "\n").replace("<i>", "").replace("</i>", "").replace("<b>", "").replace("</b>", "")
        desc_short = desc_raw[:200] + "…" if len(desc_raw) > 200 else desc_raw
        status_label = status_map.get(status, status)

        if lang == "ru":
            card = (
                f"*{esc(title)}*"
                + (f" \\| _{esc(title_native)}_" if title_native else "")
                + f"\n\n⭐ {score}/100 \\| {esc(fmt)} \\| {esc(str(year))}"
                + f"\n📺 Эпизоды: {esc(str(episodes))} \\| {esc(status_label)}"
                + (f"\n🏷 {esc(genres)}" if genres else "")
                + (f"\n\n_{esc(desc_short)}_" if desc_short else "")
                + f"\n\n[Открыть на AniList](https://anilist\\.co/anime/{item['id']})"
            )
        else:
            card = (
                f"*{esc(title)}*"
                + (f" \\| _{esc(title_native)}_" if title_native else "")
                + f"\n\n⭐ {score}/100 \\| {esc(fmt)} \\| {esc(str(year))}"
                + f"\n📺 Episodes: {esc(str(episodes))} \\| {esc(status_label)}"
                + (f"\n🏷 {esc(genres)}" if genres else "")
                + (f"\n\n_{esc(desc_short)}_" if desc_short else "")
                + f"\n\n[Open on AniList](https://anilist\\.co/anime/{item['id']})"
            )

        uid_hash = hashlib.md5(f"{item['id']}".encode()).hexdigest()

        if cover:
            results.append(InlineQueryResultPhoto(
                id=uid_hash, photo_url=cover, thumbnail_url=cover,
                title=title,
                description=f"⭐{score} | {fmt} | {year} | {genres[:40]}",
                caption=card, parse_mode="MarkdownV2",
            ))
        else:
            results.append(InlineQueryResultArticle(
                id=uid_hash, title=title,
                description=f"⭐{score} | {fmt} | {genres[:50]}",
                input_message_content=InputTextMessageContent(message_text=card, parse_mode="MarkdownV2")
            ))

    await query.answer(results, cache_time=30)
