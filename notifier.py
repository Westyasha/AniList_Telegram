import asyncio
import logging
from datetime import datetime, timezone

from aiogram import Bot
from core.api import anilist_query
from storage import get_notifications_users, get_token, get_anilist_id
from core.formatters import esc

logger = logging.getLogger(__name__)

CHECK_INTERVAL = 3600

_sent_notifications: set[tuple[int, int, int]] = set()

Q_AIRING_SOON = """
query ($page: Int, $windowEnd: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(
      airingAt_greater: 0
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
        mediaListEntry { status }
      }
    }
  }
}
"""

Q_USER_WATCHING = """
query ($userId: Int) {
  MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
    lists {
      entries {
        mediaId
        progress
      }
    }
  }
}
"""


async def notify_user(bot: Bot, user_id: int, media: dict, episode: int):
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
    b.add(btn(f"▶️ +1 эпизод", f"progress:{media_id}"))
    b.add(btn("📋 Карточка", f"media:{media_id}"))
    b.adjust(2)

    try:
        if cover:
            await bot.send_photo(
                chat_id=user_id,
                photo=cover,
                caption=text,
                parse_mode="MarkdownV2",
                reply_markup=b.as_markup()
            )
        else:
            await bot.send_message(
                chat_id=user_id,
                text=text,
                parse_mode="MarkdownV2",
                reply_markup=b.as_markup()
            )
    except Exception as e:
        logger.warning(f"Failed to notify user {user_id}: {e}")


async def check_and_notify(bot: Bot):
    global _sent_notifications

    now_ts = int(datetime.now(timezone.utc).timestamp())
    window_end = now_ts + CHECK_INTERVAL

    _sent_notifications = {
        key for key in _sent_notifications
        if key[2] > now_ts - CHECK_INTERVAL * 2
    }

    try:
        result = await anilist_query(Q_AIRING_SOON, {"page": 1, "windowEnd": window_end})
        schedules = result.get("data", {}).get("Page", {}).get("airingSchedules", [])
    except Exception as e:
        logger.error(f"Notifier API error: {e}")
        return

    if not schedules:
        return

    airing_ids = {s["media"]["id"]: s for s in schedules}

    users = get_notifications_users()
    for user_id in users:
        token = get_token(user_id)
        anilist_id = get_anilist_id(user_id)
        if not token or not anilist_id:
            continue

        try:
            res = await anilist_query(Q_USER_WATCHING, {"userId": anilist_id}, token=token)
            lists = res.get("data", {}).get("MediaListCollection", {}).get("lists", [])
            watching_ids = set()
            for lst in lists:
                for entry in lst.get("entries", []):
                    watching_ids.add(entry["mediaId"])
        except Exception:
            continue

        for media_id, schedule in airing_ids.items():
            if media_id not in watching_ids:
                continue

            episode = schedule["episode"]
            dedup_key = (user_id, media_id, episode)
            if dedup_key in _sent_notifications:
                continue

            await notify_user(bot, user_id, schedule["media"], episode)
            _sent_notifications.add(dedup_key)
            await asyncio.sleep(0.05)


async def notifier_loop(bot: Bot):
    logger.info("Notifier started")
    while True:
        try:
            await check_and_notify(bot)
        except Exception as e:
            logger.error(f"Notifier loop error: {e}")
        await asyncio.sleep(CHECK_INTERVAL)
