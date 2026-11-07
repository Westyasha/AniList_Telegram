import asyncio
import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError, TelegramForbiddenError, TelegramRetryAfter
from aiogram.types import InlineKeyboardMarkup, LinkPreviewOptions

from app.anilist import helpers
from app.anilist import queries as q
from app.anilist.client import AniListError
from app.bot.ui import Kb, b, btn, h
from app.container import Container
from app.db.models import User
from app.i18n import i18n
from app.services.metrics import metrics

log = logging.getLogger(__name__)

LIST_IDS = """
query ListIds($userId: Int) {
  MediaListCollection(userId: $userId, type: ANIME) {
    lists { status isCustomList entries { mediaId status progress } }
  }
}
"""

AIRING_STATUS_KEYS = {
    "airing_watching": ("CURRENT", "REPEATING"),
    "airing_planning": ("PLANNING",),
    "airing_paused": ("PAUSED",),
    "airing_dropped": ("DROPPED",),
}
SOCIAL_TYPES = ["FOLLOWING", "ACTIVITY_LIKE", "ACTIVITY_REPLY", "ACTIVITY_MENTION", "ACTIVITY_MESSAGE"]
RELATED_TYPES = {"SEQUEL", "PREQUEL", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE", "PARENT"}
LIST_TTL = 1800
RELATED_INTERVAL = 6 * 3600
MAX_WINDOW = 6 * 3600


class Notifier:
    def __init__(self, app: Container, bot: Bot) -> None:
        self.app = app
        self.bot = bot
        self._lists: dict[int, tuple[float, dict[int, dict[str, Any]]]] = {}
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="notifier")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self) -> None:
        await asyncio.sleep(15)
        while True:
            started = time.monotonic()
            try:
                await self.tick()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Notifier tick failed")
            elapsed = time.monotonic() - started
            metrics.notifier_last_run = time.time()
            metrics.notifier_last_duration = elapsed
            await asyncio.sleep(max(30.0, self.app.settings.notifier_interval - elapsed))

    async def tick(self) -> None:
        users = await self.app.users.notifiable()
        now = int(time.time())
        await self._airing(users, now)
        await self._related(users, now)
        await self._social(users)
        await self.app.sent.prune(30 * 86400)
        await self.app.nav.prune(14 * 86400)

    async def _user_list(self, user: User) -> dict[int, dict[str, Any]]:
        cached = self._lists.get(user.user_id)
        if cached and time.monotonic() - cached[0] < LIST_TTL:
            return cached[1]
        data = await self.app.anilist.query(LIST_IDS, {"userId": user.anilist_id}, token=user.token)
        entries: dict[int, dict[str, Any]] = {}
        for block in ((data.get("MediaListCollection") or {}).get("lists")) or []:
            for entry in block.get("entries") or []:
                entries.setdefault(entry["mediaId"], entry)
        self._lists[user.user_id] = (time.monotonic(), entries)
        return entries

    async def _airing(self, users: list[User], now: int) -> None:
        last = int(await self.app.kv.get("airing_checked") or now - self.app.settings.notifier_interval)
        start = max(last, now - MAX_WINDOW)
        schedules: list[dict[str, Any]] = []
        for page in range(1, 6):
            data = await self.app.anilist.query(q.SCHEDULE, {"from": start, "to": now + 1, "page": page, "perPage": 50})
            block = data.get("Page") or {}
            schedules += block.get("airingSchedules") or []
            if not (block.get("pageInfo") or {}).get("hasNextPage"):
                break
        await self.app.kv.set("airing_checked", str(now))
        aired = {s["media"]["id"]: s for s in schedules if s["airingAt"] <= now}
        if not aired:
            return
        for user in users:
            statuses = {s for key, values in AIRING_STATUS_KEYS.items() if user.notifications.get(key) for s in values}
            if not statuses:
                continue
            try:
                entries = await self._user_list(user)
            except AniListError as exc:
                log.warning("List fetch failed for %s: %s", user.user_id, exc.message)
                continue
            for media_id, schedule in aired.items():
                entry = entries.get(media_id)
                if not entry or entry["status"] not in statuses:
                    continue
                if not await self.app.sent.mark(user.user_id, "airing", media_id, schedule["episode"]):
                    continue
                await self._send_airing(user, schedule, entry)

    async def _send_airing(self, user: User, schedule: dict[str, Any], entry: dict[str, Any]) -> None:
        _ = i18n.get(user.lang)
        media = schedule["media"]
        episode = schedule["episode"]
        total = media.get("episodes")
        progress = entry.get("progress") or 0
        lines = [
            _("notify.airing_head"),
            f"<b>{h(helpers.title(media, user.title_pref))}</b>",
            _("notify.airing_body", ep=b(episode), total=total or "?"),
        ]
        if progress < episode - 1:
            lines.append(_("notify.behind", n=episode - 1 - progress))
        kb = Kb()
        if progress < episode:
            kb.row(btn(_("notify.mark", ep=episode), f"!pe:{media['id']}:{episode}", "success"))
        kb.row(btn(_("notify.open"), f"/m/{media['id']}"))
        await self._deliver(user, "\n".join(lines), kb.build(), helpers.hero_image(media))

    async def _related(self, users: list[User], now: int) -> None:
        wanted = [u for u in users if u.notifications.get("related")]
        last = int(await self.app.kv.get("related_checked") or 0)
        if not wanted or now - last < RELATED_INTERVAL:
            return
        today = datetime.now(UTC)
        variables = {
            "from": helpers.fuzzy_date_int(today - timedelta(days=2)),
            "to": helpers.fuzzy_date_int(today + timedelta(days=1)),
        }
        releases: list[dict[str, Any]] = []
        for page in range(1, 4):
            data = await self.app.anilist.query(q.NEW_RELEASES, {**variables, "page": page})
            block = data.get("Page") or {}
            releases += block.get("media") or []
            if not (block.get("pageInfo") or {}).get("hasNextPage"):
                break
        await self.app.kv.set("related_checked", str(now))
        for user in wanted:
            try:
                entries = await self._user_list(user)
            except AniListError:
                continue
            for media in releases:
                if media["id"] in entries:
                    continue
                parent = next(
                    (
                        edge
                        for edge in (media.get("relations") or {}).get("edges") or []
                        if edge.get("relationType") in RELATED_TYPES and edge["node"]["id"] in entries
                    ),
                    None,
                )
                if parent is None or not await self.app.sent.mark(user.user_id, "related", media["id"]):
                    continue
                _ = i18n.get(user.lang)
                relation = _(f"relation.{parent['relationType'].lower()}")
                text = "\n".join(
                    [
                        _("notify.related_head", relation=relation),
                        f"<b>{h(helpers.title(media, user.title_pref))}</b>",
                    ]
                )
                kb = Kb().row(btn(_("notify.open"), f"/m/{media['id']}"))
                await self._deliver(user, text, kb.build(), helpers.hero_image(media))

    async def _social(self, users: list[User]) -> None:
        for user in [u for u in users if u.notifications.get("anilist_activity")]:
            try:
                data = await self.app.anilist.query(
                    q.NOTIFICATIONS, {"perPage": 10, "types": SOCIAL_TYPES, "reset": False}, token=user.token
                )
            except AniListError:
                continue
            items = [n for n in (data.get("Page") or {}).get("notifications") or [] if n.get("id")]
            if not items:
                continue
            newest = max(n["id"] for n in items)
            if user.last_notification == 0:
                await self.app.users.set_last_notification(user.user_id, newest)
                continue
            fresh = sorted((n for n in items if n["id"] > user.last_notification), key=lambda n: n["id"])
            if not fresh:
                continue
            _ = i18n.get(user.lang)
            lines = [_("notify.social_head")]
            for item in fresh[:5]:
                who = b((item.get("user") or {}).get("name") or "?")
                context = h((item.get("context") or "").strip())
                lines.append(f"• {who} {context}")
            kb = Kb().row(btn(_("home.inbox_short"), "/inbox"))
            await self._deliver(user, "\n".join(lines), kb.build(), None)
            await self.app.users.set_last_notification(user.user_id, newest)

    async def _deliver(self, user: User, text: str, markup: InlineKeyboardMarkup | None, image: str | None) -> None:
        preview = (
            LinkPreviewOptions(url=image, prefer_large_media=True, show_above_text=True)
            if image
            else LinkPreviewOptions(is_disabled=True)
        )
        for _ in range(2):
            try:
                await self.bot.send_message(user.user_id, text, reply_markup=markup, link_preview_options=preview)
                metrics.notifications.record()
                await asyncio.sleep(0.05)
                return
            except TelegramRetryAfter as exc:
                await asyncio.sleep(exc.retry_after)
            except TelegramForbiddenError:
                await self.app.users.set_blocked(user.user_id, True)
                return
            except TelegramAPIError as exc:
                log.warning("Failed to notify %s: %s", user.user_id, exc)
                return
