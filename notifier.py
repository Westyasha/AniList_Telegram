import asyncio
import logging
from datetime import datetime, timezone

from aiogram import Bot
from core.api import anilist_query
from storage import get_token, get_anilist_id, get_notifications_users_with_settings
from core.formatters import esc

logger = logging.getLogger(__name__)

CHECK_INTERVAL = 3600

_sent_notifications: set[tuple[int, int, int, str]] = set()

Q_AIRING_SOON = """
query ($page: Int, $windowStart: Int, $windowEnd: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(
      airingAt_greater: $windowStart
      airingAt_lesser: $windowEnd
      sort: TIME
    ) {
      airingAt
      episode
      media {
        id
        type
        title { romaji english }
        coverImage { extraLarge large }
        relations {
          edges {
            relationType
            node { id type title { romaji english } coverImage { large } }
          }
        }
      }
    }
  }
}
"""

Q_USER_LIST = """
query ($userId: Int) {
  MediaListCollection(userId: $userId, type: ANIME) {
    lists {
      status
      entries { mediaId progress }
    }
  }
}
"""

Q_RELATED_ADDITIONS = """
query ($page: Int, $windowStart: Int, $windowEnd: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(
      type: ANIME
      startDate_greater: $windowStart
      startDate_lesser: $windowEnd
      sort: START_DATE_DESC
    ) {
      id
      title { romaji english }
      coverImage { extraLarge large }
      relations {
        edges {
          relationType
          node { id }
        }
      }
    }
  }
}
"""

STATUS_ORDER = {"CURRENT", "PLANNING", "PAUSED", "DROPPED", "COMPLETED", "REPEATING"}


def _user_lists_by_status(media_list_collection: dict) -> dict[str, set[int]]:
    result: dict[str, set[int]] = {s: set() for s in STATUS_ORDER}
    for lst in (media_list_collection or {}).get("lists", []):
        status = lst.get("status", "CURRENT")
        for entry in lst.get("entries", []):
            result.setdefault(status, set()).add(entry["mediaId"])
    return result


async def _send_airing_notification(bot: Bot, user_id: int, media: dict, episode: int):
    title_obj = media.get("title", {})
    title = title_obj.get("english") or title_obj.get("romaji") or "?"
    cover = (media.get("coverImage") or {}).get("extraLarge") or (media.get("coverImage") or {}).get("large")
    media_id = media.get("id")

    text = (
        f"🔔 *Новый эпизод\\!*\n\n"
        f"*{esc(title)}*\n"
        f"📺 Вышел эпизод *{episode}*\n\n"
        f"[Открыть на AniList](https://anilist\\.co/anime/{media_id})"
    )

    from aiogram.utils.keyboard import InlineKeyboardBuilder
    from keyboards import btn
    b = InlineKeyboardBuilder()
    b.add(btn("▶️ +1 эпизод", f"progress:{media_id}"))
    b.add(btn("📋 Карточка", f"media:{media_id}"))
    b.adjust(2)

    try:
        if cover:
            await bot.send_photo(chat_id=user_id, photo=cover, caption=text,
                                 parse_mode="MarkdownV2", reply_markup=b.as_markup())
        else:
            await bot.send_message(chat_id=user_id, text=text,
                                   parse_mode="MarkdownV2", reply_markup=b.as_markup())
    except Exception as e:
        logger.warning(f"Failed airing notify user {user_id}: {e}")


async def _send_related_notification(bot: Bot, user_id: int, media: dict, rel_type: str):
    title_obj = media.get("title", {})
    title = title_obj.get("english") or title_obj.get("romaji") or "?"
    cover = (media.get("coverImage") or {}).get("extraLarge") or (media.get("coverImage") or {}).get("large")
    media_id = media.get("id")

    rel_labels = {
        "SEQUEL": "📢 Вышло продолжение\\!",
        "PREQUEL": "📢 Вышел приквел\\!",
        "SIDE_STORY": "📢 Вышла побочная история\\!",
        "SPIN_OFF": "📢 Вышел спин\\-офф\\!",
        "ALTERNATIVE": "📢 Вышла альтернативная версия\\!",
    }
    header = rel_labels.get(rel_type, "📢 Вышло связанное аниме\\!")

    text = (
        f"{header}\n\n"
        f"*{esc(title)}*\n\n"
        f"[Открыть на AniList](https://anilist\\.co/anime/{media_id})"
    )

    from aiogram.utils.keyboard import InlineKeyboardBuilder
    from keyboards import btn
    b = InlineKeyboardBuilder()
    b.add(btn("📋 Карточка", f"media:{media_id}"))
    b.add(btn("➕ В список", f"addtolist:{media_id}"))
    b.adjust(2)

    try:
        if cover:
            await bot.send_photo(chat_id=user_id, photo=cover, caption=text,
                                 parse_mode="MarkdownV2", reply_markup=b.as_markup())
        else:
            await bot.send_message(chat_id=user_id, text=text,
                                   parse_mode="MarkdownV2", reply_markup=b.as_markup())
    except Exception as e:
        logger.warning(f"Failed related notify user {user_id}: {e}")


async def _fetch_all_pages(query: str, variables: dict) -> list[dict]:
    results = []
    page = 1
    while True:
        try:
            variables["page"] = page
            data = await anilist_query(query, variables)
            page_data = data.get("data", {}).get("Page", {})
            items = page_data.get("airingSchedules") or page_data.get("media") or []
            results.extend(items)
            if not page_data.get("pageInfo", {}).get("hasNextPage"):
                break
            page += 1
        except Exception as e:
            logger.error(f"Pagination error at page {page}: {e}")
            break
    return results


async def check_and_notify(bot: Bot):
    global _sent_notifications

    now_ts = int(datetime.now(timezone.utc).timestamp())
    window_start = now_ts - CHECK_INTERVAL
    window_end = now_ts + CHECK_INTERVAL

    _sent_notifications = {
        key for key in _sent_notifications
        if isinstance(key[2], int) and key[2] > window_start
    }

    try:
        schedules = await _fetch_all_pages(
            Q_AIRING_SOON,
            {"windowStart": window_start, "windowEnd": window_end}
        )
    except Exception as e:
        logger.error(f"Notifier airing API error: {e}")
        return

    airing_map: dict[int, dict] = {s["media"]["id"]: s for s in schedules}

    users = get_notifications_users_with_settings()
    for user_id, ns in users:
        token = get_token(user_id)
        anilist_id = get_anilist_id(user_id)
        if not token or not anilist_id:
            continue

        try:
            res = await anilist_query(Q_USER_LIST, {"userId": anilist_id}, token=token)
            by_status = _user_lists_by_status(
                res.get("data", {}).get("MediaListCollection", {})
            )
        except Exception:
            continue

        want_airing: set[int] = set()
        if ns.get("airing_watching"):
            want_airing |= by_status.get("CURRENT", set())
            want_airing |= by_status.get("REPEATING", set())
        if ns.get("airing_planned"):
            want_airing |= by_status.get("PLANNING", set())
        if ns.get("airing_paused"):
            want_airing |= by_status.get("PAUSED", set())
        if ns.get("airing_dropped"):
            want_airing |= by_status.get("DROPPED", set())

        for media_id, schedule in airing_map.items():
            if media_id not in want_airing:
                continue
            episode = schedule["episode"]
            airing_at = schedule["airingAt"]
            dedup = (user_id, media_id, airing_at, "airing")
            if dedup in _sent_notifications:
                continue
            await _send_airing_notification(bot, user_id, schedule["media"], episode)
            _sent_notifications.add(dedup)
            await asyncio.sleep(0.05)

        if ns.get("related_addition"):
            all_user_ids: set[int] = set()
            for s in by_status.values():
                all_user_ids |= s

            try:
                new_media_list = await _fetch_all_pages(
                    Q_RELATED_ADDITIONS,
                    {"windowStart": window_start, "windowEnd": window_end}
                )
            except Exception as e:
                logger.error(f"Related additions API error for user {user_id}: {e}")
                new_media_list = []

            for media in new_media_list:
                child_id = media.get("id")
                if child_id in all_user_ids:
                    continue
                for edge in (media.get("relations") or {}).get("edges", []):
                    rel_node = edge.get("node", {})
                    rel_type = edge.get("relationType", "")
                    parent_id = rel_node.get("id")
                    if (
                        rel_type in ("SEQUEL", "PREQUEL", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE")
                        and parent_id in all_user_ids
                    ):
                        dedup = (user_id, child_id, 0, "related")
                        if dedup in _sent_notifications:
                            continue
                        await _send_related_notification(bot, user_id, media, rel_type)
                        _sent_notifications.add(dedup)
                        await asyncio.sleep(0.05)
                        break

        await asyncio.sleep(0.1)


async def notifier_loop(bot: Bot):
    logger.info("Notifier started")
    while True:
        try:
            await check_and_notify(bot)
        except Exception as e:
            logger.error(f"Notifier loop error: {e}")
        await asyncio.sleep(CHECK_INTERVAL)