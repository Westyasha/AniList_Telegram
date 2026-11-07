import hashlib
import json
import re
from collections import Counter
from datetime import UTC, datetime
from typing import Any

from app.anilist import helpers
from app.anilist import queries as q
from app.anilist.client import AniListClient
from app.services.cards.images import accent_colors, blurred_backdrop
from app.services.cards.renderer import CardRenderer

FAVOURITES_SHOWN = 10
RENDER_VERSION = 2
CARD_SCALE = 2.0
WRAPPED_SCALE = 4 / 3
WRAPPED_PAGES = 12
_RANGE_RE = re.compile(r"(\d+)\s*-\s*(\d+)")


def digest(data: Any) -> str:
    raw = json.dumps([RENDER_VERSION, data], sort_keys=True, ensure_ascii=False)
    return hashlib.blake2b(raw.encode(), digest_size=12).hexdigest()


async def fetch_card_user(client: AniListClient, name: str, token: str | None = None) -> dict[str, Any]:
    data = await client.query(q.CARD_USER, {"name": name}, token=token, ttl=120)
    return data.get("User") or {}


def card_payload(user: dict[str, Any]) -> dict[str, Any]:
    stats = user.get("statistics") or {}
    anime = stats.get("anime") or {}
    manga = stats.get("manga") or {}
    favourites = user.get("favourites") or {}
    fav_anime = favourites.get("anime") or {}
    fav_chars = favourites.get("characters") or {}
    anime_nodes = fav_anime.get("nodes") or []
    char_nodes = fav_chars.get("nodes") or []
    return {
        "name": user.get("name") or "?",
        "avatar": (user.get("avatar") or {}).get("large"),
        "banner": user.get("bannerImage"),
        "anime_count": anime.get("count") or 0,
        "manga_count": manga.get("count") or 0,
        "chapters": manga.get("chaptersRead") or 0,
        "episodes": anime.get("episodesWatched") or 0,
        "days": round((anime.get("minutesWatched") or 0) / 1440, 1),
        "score": anime.get("meanScore") or 0,
        "genres": [g["genre"] for g in (anime.get("genres") or [])[:4]],
        "anime": [
            {"title": helpers.title(n), "cover": helpers.cover(n, "extraLarge")} for n in anime_nodes[:FAVOURITES_SHOWN]
        ],
        "anime_more": max(0, ((fav_anime.get("pageInfo") or {}).get("total") or len(anime_nodes)) - FAVOURITES_SHOWN),
        "characters": [{"name": helpers.name(n), "image": helpers.image(n)} for n in char_nodes[:FAVOURITES_SHOWN]],
        "characters_more": max(
            0, ((fav_chars.get("pageInfo") or {}).get("total") or len(char_nodes)) - FAVOURITES_SHOWN
        ),
    }


async def render_profile_card(renderer: CardRenderer, payload: dict[str, Any], lang: str, bot_username: str) -> bytes:
    urls = [payload["avatar"], payload["banner"]]
    urls += [a["cover"] for a in payload["anime"]] + [c["image"] for c in payload["characters"]]
    images = await renderer.images.prefetch(urls)
    accent, accent2 = accent_colors(images.get(payload["avatar"] or ""))
    backdrop = blurred_backdrop(images.get(payload["banner"] or "") or images.get(payload["avatar"] or ""))
    return await renderer.render(
        "profile_card.html",
        {
            **payload,
            "lang": lang,
            "accent": accent,
            "accent2": accent2,
            "backdrop": backdrop,
            "bot": bot_username,
            "loaded": set(images),
        },
        width=1200,
        scale=CARD_SCALE,
    )


def _episodes(progress: str | None) -> int:
    if not progress:
        return 1
    match = _RANGE_RE.search(progress)
    if match:
        return max(1, int(match.group(2)) - int(match.group(1)) + 1)
    return 1


async def wrapped_payload(client: AniListClient, user: dict[str, Any], year: int, token: str | None) -> dict[str, Any]:
    start = int(datetime(year, 1, 1, tzinfo=UTC).timestamp())
    end = int(datetime(year + 1, 1, 1, tzinfo=UTC).timestamp())
    activities: list[dict[str, Any]] = []
    for page in range(1, WRAPPED_PAGES + 1):
        data = await client.query(
            q.WRAPPED_ACTIVITY,
            {"userId": user["id"], "from": start, "to": end, "page": page},
            token=token,
            ttl=600,
        )
        block = data.get("Page") or {}
        activities += [a for a in block.get("activities") or [] if a]
        if not (block.get("pageInfo") or {}).get("hasNextPage"):
            break
    monthly = [0] * 12
    episodes = 0
    minutes = 0
    completed: set[int] = set()
    per_media: Counter[int] = Counter()
    genres: Counter[str] = Counter()
    media_info: dict[int, dict[str, Any]] = {}
    for activity in activities:
        media = activity.get("media") or {}
        media_id = media.get("id")
        if not media_id:
            continue
        media_info[media_id] = media
        month = datetime.fromtimestamp(activity["createdAt"], UTC).month - 1
        status = (activity.get("status") or "").lower()
        count = _episodes(activity.get("progress")) if "watched" in status or "rewatched" in status else 0
        if "completed" in status:
            completed.add(media_id)
        episodes += count
        minutes += count * (media.get("duration") or 24)
        monthly[month] += max(count, 1)
        per_media[media_id] += max(count, 1)
        for genre in media.get("genres") or []:
            genres[genre] += max(count, 1)
    top = [media_info[mid] for mid, _ in per_media.most_common(5)]
    best_month = max(range(12), key=lambda m: monthly[m]) if any(monthly) else None
    return {
        "name": user.get("name") or "?",
        "avatar": (user.get("avatar") or {}).get("large"),
        "banner": user.get("bannerImage"),
        "year": year,
        "episodes": episodes,
        "hours": round(minutes / 60),
        "completed": len(completed),
        "titles": len(per_media),
        "activities": len(activities),
        "monthly": monthly,
        "best_month": best_month,
        "genres": genres.most_common(5),
        "top": [
            {"title": helpers.title(m), "cover": helpers.cover(m, "extraLarge"), "count": per_media[m["id"]]}
            for m in top
        ],
    }


async def render_wrapped(renderer: CardRenderer, payload: dict[str, Any], lang: str, bot_username: str) -> bytes:
    urls = [payload["avatar"], payload["banner"]] + [t["cover"] for t in payload["top"]]
    images = await renderer.images.prefetch(urls)
    accent, accent2 = accent_colors(images.get(payload["avatar"] or ""))
    backdrop = blurred_backdrop(images.get(payload["banner"] or "") or images.get(payload["avatar"] or ""), width=540)
    return await renderer.render(
        "wrapped.html",
        {
            **payload,
            "lang": lang,
            "accent": accent,
            "accent2": accent2,
            "backdrop": backdrop,
            "bot": bot_username,
            "max_month": max(payload["monthly"]) or 1,
            "max_genre": (payload["genres"][0][1] if payload["genres"] else 1) or 1,
            "loaded": set(images),
        },
        width=1080,
        height=1920,
        scale=WRAPPED_SCALE,
    )
