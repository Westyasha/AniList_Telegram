from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InputMediaPhoto

from core.api import anilist_query, Q_VIEWER, Q_TRENDING, Q_SEASONAL, Q_AIRING_SCHEDULE
from core.formatters import profile_card, esc, fseason, current_season, fairing_ts, ftime_until
from keyboards import trending_kb, season_kb, schedule_kb
from locales.i18n import t
from storage import get_token, set_anilist_id

router = Router()


def _dest(target):
    return target.message if isinstance(target, CallbackQuery) else target


async def _edit_or_answer(target, text: str, **kwargs):
    if isinstance(target, CallbackQuery):
        try:
            await target.message.edit_text(text, **kwargs)
            return
        except Exception:
            pass
        await target.message.answer(text, **kwargs)
    else:
        await target.answer(text, **kwargs)


# ─── PROFILE ──────────────────────────────────────────────────────────────────

async def show_profile(target, uid: int):
    token = get_token(uid)
    if not token:
        await _dest(target).answer(t(uid, "profile_need_auth"), parse_mode="MarkdownV2")
        return
    result = await anilist_query(Q_VIEWER, token=token)
    viewer = result.get("data", {}).get("Viewer")
    if not viewer:
        await _dest(target).answer(t(uid, "profile_error"), parse_mode="MarkdownV2")
        return
    set_anilist_id(uid, viewer["id"])
    caption = profile_card(viewer)
    banner = viewer.get("bannerImage")
    avatar = (viewer.get("avatar") or {}).get("large")
    dest = _dest(target)

    if banner and avatar:
        try:
            await dest.answer_media_group(media=[
                InputMediaPhoto(media=banner, caption=caption, parse_mode="MarkdownV2"),
                InputMediaPhoto(media=avatar),
            ])
            return
        except Exception:
            pass
    photo = banner or avatar
    if photo:
        try:
            await dest.answer_photo(photo=photo, caption=caption, parse_mode="MarkdownV2")
            return
        except Exception:
            pass
    await dest.answer(caption, parse_mode="MarkdownV2")


@router.message(F.text.in_({"👤 Профиль", "👤 Profile"}))
async def profile_cmd(msg: Message):
    await show_profile(msg, msg.from_user.id)


@router.callback_query(F.data == "myprofile")
async def profile_cb(cb: CallbackQuery):
    await show_profile(cb, cb.from_user.id)
    await cb.answer()


# ─── TRENDING ─────────────────────────────────────────────────────────────────

@router.message(F.text.in_({"🔥 Тренды", "🔥 Trending"}))
async def trending_cmd(msg: Message):
    await _show_trending(msg, "ANIME", 1, msg.from_user.id)


@router.callback_query(F.data.startswith("trending:"))
async def trending_cb(cb: CallbackQuery):
    parts = cb.data.split(":")
    mtype, page = parts[1], int(parts[2])
    await _show_trending(cb, mtype, page, cb.from_user.id)
    await cb.answer()


async def _show_trending(target, mtype: str, page: int, uid: int):
    result = await anilist_query(Q_TRENDING, {"type": mtype, "page": page})
    pdata = result.get("data", {}).get("Page", {})
    items = pdata.get("media", [])
    pinfo = pdata.get("pageInfo", {})

    if not items:
        await _edit_or_answer(target, t(uid, "trending_empty"), parse_mode="MarkdownV2")
        return

    key = "trending_anime" if mtype == "ANIME" else "trending_manga"
    lines = [t(uid, key, page=page), ""]
    for i, item in enumerate(items, start=(page - 1) * 8 + 1):
        title = item["title"].get("english") or item["title"]["romaji"]
        score = item.get("averageScore") or 0
        trend = item.get("trending") or 0
        genres = ", ".join(item.get("genres", [])[:3])
        nep = item.get("nextAiringEpisode")
        ep_str = f" ▶️Ep{nep['episode']} in {ftime_until(nep['timeUntilAiring'])}" if nep else ""
        lines.append(f"*{i}\\.* {esc(title[:40])}")
        lines.append(f"   ⭐{score} 🔥{trend} \\| {esc(genres)}{esc(ep_str)}")

    kb = trending_kb(uid, items, mtype, page, pinfo.get("hasNextPage", False))
    text = "\n".join(lines)
    is_cb = isinstance(target, CallbackQuery)

    if is_cb:
        await _edit_or_answer(target, text, parse_mode="MarkdownV2", reply_markup=kb)
    else:
        covers = [item.get("coverImage", {}).get("large") for item in items if item.get("coverImage", {}).get("large")]
        if covers:
            try:
                await target.answer_media_group(media=[InputMediaPhoto(media=url) for url in covers[:10]])
            except Exception:
                pass
        await target.answer(text, parse_mode="MarkdownV2", reply_markup=kb)


# ─── SEASON ───────────────────────────────────────────────────────────────────

@router.message(F.text.in_({"🌸 Сезон", "🌸 Season"}))
async def season_cmd(msg: Message):
    s, y = current_season()
    await _show_season(msg, s, y, 1, msg.from_user.id)


@router.callback_query(F.data.startswith("season:"))
async def season_cb(cb: CallbackQuery):
    parts = cb.data.split(":")
    s, y, page = parts[1], int(parts[2]), int(parts[3])
    await _show_season(cb, s, y, page, cb.from_user.id)
    await cb.answer()


async def _show_season(target, season: str, year: int, page: int, uid: int):
    result = await anilist_query(Q_SEASONAL, {"season": season, "seasonYear": year, "page": page})
    pdata = result.get("data", {}).get("Page", {})
    items = pdata.get("media", [])
    pinfo = pdata.get("pageInfo", {})
    season_icons = {"WINTER": "❄️", "SPRING": "🌸", "SUMMER": "☀️", "FALL": "🍂"}
    season_label = f"{season_icons.get(season, '')} {fseason(season)}"

    if not items:
        await _edit_or_answer(target, t(uid, "season_empty"), parse_mode="MarkdownV2")
        return

    lines = [t(uid, "season_title", season=season_label, year=year, page=page), ""]
    for i, item in enumerate(items, start=(page - 1) * 8 + 1):
        title = item["title"].get("english") or item["title"]["romaji"]
        score = item.get("averageScore") or 0
        eps = item.get("episodes") or "?"
        studios = item.get("studios", {}).get("nodes", [])
        studio = studios[0]["name"] if studios else ""
        nep = item.get("nextAiringEpisode")
        ep_info = f"Ep{nep['episode']} in {ftime_until(nep['timeUntilAiring'])}" if nep else f"{eps} eps"
        lines.append(f"*{i}\\.* {esc(title[:40])}")
        lines.append(f"   ⭐{score} \\| {esc(ep_info)}" + (f" \\| {esc(studio[:20])}" if studio else ""))

    kb = season_kb(uid, items, season, year, page, pinfo.get("hasNextPage", False))
    text = "\n".join(lines)
    is_cb = isinstance(target, CallbackQuery)

    if is_cb:
        await _edit_or_answer(target, text, parse_mode="MarkdownV2", reply_markup=kb)
    else:
        covers = [item.get("coverImage", {}).get("large") for item in items if item.get("coverImage", {}).get("large")]
        if covers:
            try:
                await target.answer_media_group(media=[InputMediaPhoto(media=url) for url in covers[:10]])
            except Exception:
                pass
        await target.answer(text, parse_mode="MarkdownV2", reply_markup=kb)


# ─── SCHEDULE ─────────────────────────────────────────────────────────────────

@router.message(F.text.in_({"🗓 Расписание", "🗓 Schedule"}))
async def schedule_cmd(msg: Message):
    await _show_schedule(msg, upcoming=True, page=1, uid=msg.from_user.id)


@router.callback_query(F.data.startswith("schedule:"))
async def schedule_cb(cb: CallbackQuery):
    parts = cb.data.split(":")
    upcoming, page = bool(int(parts[1])), int(parts[2])
    await _show_schedule(cb, upcoming=upcoming, page=page, uid=cb.from_user.id)
    await cb.answer()


async def _show_schedule(target, upcoming: bool, page: int, uid: int):
    result = await anilist_query(Q_AIRING_SCHEDULE, {"page": page, "notYetAired": upcoming})
    pdata = result.get("data", {}).get("Page", {})
    schedules = pdata.get("airingSchedules", [])
    pinfo = pdata.get("pageInfo", {})

    if not schedules:
        await _edit_or_answer(target, t(uid, "schedule_empty"), parse_mode="MarkdownV2")
        return

    key = "schedule_upcoming" if upcoming else "schedule_aired"
    lines = [t(uid, key, page=page), ""]

    for item in schedules:
        media = item["media"]
        title = media["title"].get("english") or media["title"]["romaji"]
        ep = item["episode"]
        time_left = item["timeUntilAiring"]
        airing_ts_val = item["airingAt"]
        score = media.get("averageScore") or 0
        ml = media.get("mediaListEntry")
        in_list = "📋 " if ml else ""
        score_str = f" ⭐{score}" if score else ""
        time_str = ftime_until(time_left) if upcoming else fairing_ts(airing_ts_val)
        lines.append(f"{in_list}*Ep\\.{ep}* — {esc(title[:35])}{esc(score_str)}")
        lines.append(f"   {'⏰' if upcoming else '📅'} {esc(time_str)}")

    kb = schedule_kb(uid, schedules, page, pinfo.get("hasNextPage", False), upcoming)
    text = "\n".join(lines)
    is_cb = isinstance(target, CallbackQuery)

    if is_cb:
        await _edit_or_answer(target, text, parse_mode="MarkdownV2", reply_markup=kb)
    else:
        covers = [item["media"].get("coverImage", {}).get("medium") for item in schedules if item["media"].get("coverImage", {}).get("medium")]
        if covers:
            try:
                await target.answer_media_group(media=[InputMediaPhoto(media=url) for url in covers[:10]])
            except Exception:
                pass
        await target.answer(text, parse_mode="MarkdownV2", reply_markup=kb)
