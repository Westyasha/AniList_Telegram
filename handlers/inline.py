from aiogram import Router, F
from aiogram.types import (InlineQuery, InlineQueryResultArticle,
                            InputTextMessageContent, InlineQueryResultPhoto)
import hashlib
from core.api import anilist_query, Q_SEARCH_MEDIA
from core.formatters import esc

router = Router()

# NOTE: "watching" and "card" prefixes handled in profile_extra.router
# This router catches all OTHER queries (anime search)

@router.inline_query()
async def inline_search(query: InlineQuery):
    q = query.query.strip()
    q_lower = q.lower()

    # Skip — handled by profile_extra
    if q_lower.startswith("watching") or q_lower.startswith("card"):
        return

    if not q or len(q) < 2:
        await query.answer(
            [],
            switch_pm_text="✏️ Type anime name to search...",
            switch_pm_parameter="start",
            cache_time=1
        )
        return

    result = await anilist_query(Q_SEARCH_MEDIA, {"search": q, "type": "ANIME", "page": 1, "perPage": 10})
    items = result.get("data", {}).get("Page", {}).get("media", [])

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

        status_map = {
            "FINISHED": "✅ Finished", "RELEASING": "▶️ Airing",
            "NOT_YET_RELEASED": "📅 Upcoming", "CANCELLED": "❌ Cancelled"
        }
        status_label = status_map.get(status, status)

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
                description=f"⭐{score} | {fmt} | {genres[:50]}",
                caption=card, parse_mode="MarkdownV2",
            ))
        else:
            results.append(InlineQueryResultArticle(
                id=uid_hash, title=title,
                description=f"⭐{score} | {fmt} | {genres[:50]}",
                input_message_content=InputTextMessageContent(message_text=card, parse_mode="MarkdownV2")
            ))

    await query.answer(results, cache_time=30,
                       switch_pm_text="🔍 Open bot", switch_pm_parameter="start")
