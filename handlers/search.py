from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from core.api import anilist_query, Q_SEARCH_MEDIA, Q_SEARCH_CHAR, Q_SEARCH_STAFF
from core.fuzzy import fuzzy_engine
from core.filter import filter_engine, GENRE_DISPLAY
from keyboards import (search_menu_kb, search_results_kb, fuzzy_results_kb,
                       filter_kb, filter_pick_genre_kb, filter_pick_year_kb,
                       filter_pick_score_kb, filter_results_kb)
from locales.i18n import t
from storage import get_token

router = Router()
PER_PAGE = 5


class SearchState(StatesGroup):
    choosing_type = State()
    waiting_query = State()
    fuzzy_query = State()


# ─── MENU ────────────────────────────────────────────────────────────────────

@router.message(F.text.in_({"🔍 Поиск", "🔍 Search"}))
async def search_menu(msg: Message):
    uid = msg.from_user.id
    await msg.answer(t(uid, "search_what"), parse_mode="MarkdownV2", reply_markup=search_menu_kb(uid))


@router.callback_query(F.data.startswith("searchtype:"))
async def search_type(cb: CallbackQuery, state: FSMContext):
    uid = cb.from_user.id
    mtype = cb.data.split(":")[1]
    await state.update_data(search_type=mtype)

    if mtype == "FUZZY":
        await cb.message.answer(t(uid, "search_fuzzy_enter"), parse_mode="MarkdownV2")
        await state.set_state(SearchState.fuzzy_query)
    else:
        labels = {
            "ANIME": t(uid, "search_type_anime"),
            "MANGA": t(uid, "search_type_manga"),
            "CHARACTER": t(uid, "search_type_char"),
            "STAFF": t(uid, "search_type_staff"),
        }
        await cb.message.answer(t(uid, "search_enter", type=labels.get(mtype, "")))
        await state.set_state(SearchState.waiting_query)
    await cb.answer()


# ─── REGULAR SEARCH ──────────────────────────────────────────────────────────

@router.message(SearchState.waiting_query)
async def process_search(msg: Message, state: FSMContext):
    data = await state.get_data()
    mtype = data.get("search_type", "ANIME")
    q = msg.text.strip()
    await state.clear()
    await do_search(msg, q, mtype, 1, msg.from_user.id)


@router.callback_query(F.data.startswith("sp:"))
async def search_page_cb(cb: CallbackQuery):
    parts = cb.data.split(":", 3)
    q, mtype, page = parts[1], parts[2], int(parts[3])
    await do_search(cb, q, mtype, page, cb.from_user.id)
    await cb.answer()


async def do_search(target, q: str, mtype: str, page: int, uid: int):
    from aiogram.types import InputMediaPhoto, CallbackQuery as CQ
    from aiogram.utils.keyboard import InlineKeyboardBuilder
    from aiogram.types import InlineKeyboardButton
    is_cb = isinstance(target, CQ)

    async def send_text(text, **kwargs):
        if is_cb:
            try:
                await target.message.edit_text(text, **kwargs)
                return
            except Exception:
                pass
            await target.message.answer(text, **kwargs)
        else:
            await target.answer(text, **kwargs)

    async def send_media(urls):
        dest = target.message if is_cb else target
        if not is_cb and urls:
            try:
                await dest.answer_media_group(media=[InputMediaPhoto(media=u) for u in urls])
            except Exception:
                pass

    token = get_token(uid)

    if mtype in ("ANIME", "MANGA"):
        result = await anilist_query(Q_SEARCH_MEDIA, {"search": q, "type": mtype, "page": page, "perPage": PER_PAGE}, token=token)
        pdata = result.get("data", {}).get("Page", {})
        items = pdata.get("media", [])
        pinfo = pdata.get("pageInfo", {})
        if not items:
            await send_text(t(uid, "search_empty", q=q), parse_mode="MarkdownV2")
            return

        covers = [item.get("coverImage", {}).get("large") for item in items if item.get("coverImage", {}).get("large")]
        await send_media(covers)

        text = t(uid, "search_results", q=q, page=page, total=pinfo.get("lastPage", 1))
        kb = search_results_kb(uid, items, page, pinfo.get("hasNextPage", False), q, mtype)
        await send_text(text, parse_mode="MarkdownV2", reply_markup=kb)

    elif mtype == "CHARACTER":
        result = await anilist_query(Q_SEARCH_CHAR, {"search": q, "page": page}, token=token)
        pdata = result.get("data", {}).get("Page", {})
        chars = pdata.get("characters", [])
        pinfo = pdata.get("pageInfo", {})
        if not chars:
            await send_text(t(uid, "search_empty", q=q), parse_mode="MarkdownV2")
            return

        photos = [c.get("image", {}).get("large") for c in chars if c.get("image", {}).get("large")]
        await send_media(photos[:6])

        b = InlineKeyboardBuilder()
        for c in chars:
            name = c["name"]["full"]
            favs = c.get("favourites", 0)
            media_list = [m["title"]["romaji"] for m in c.get("media", {}).get("nodes", [])[:2]]
            label = f"{name} ❤️{favs}" + (f" — {', '.join(media_list)}" if media_list else "")
            b.button(text=label[:60], callback_data=f"char:{c['id']}")
        b.adjust(1)
        nav = []
        if page > 1:
            nav.append(InlineKeyboardButton(text="◀️", callback_data=f"sp:{q}:CHARACTER:{page-1}"))
        if pinfo.get("hasNextPage"):
            nav.append(InlineKeyboardButton(text="▶️", callback_data=f"sp:{q}:CHARACTER:{page+1}"))
        if nav:
            b.row(*nav)
        await send_text(t(uid, "search_results", q=q, page=page, total=pinfo.get("lastPage", 1)),
                        parse_mode="MarkdownV2", reply_markup=b.as_markup())

    elif mtype == "STAFF":
        result = await anilist_query(Q_SEARCH_STAFF, {"search": q, "page": page}, token=token)
        pdata = result.get("data", {}).get("Page", {})
        staff_list = pdata.get("staff", [])
        pinfo = pdata.get("pageInfo", {})
        if not staff_list:
            await send_text(t(uid, "search_empty", q=q), parse_mode="MarkdownV2")
            return
        b = InlineKeyboardBuilder()
        for s in staff_list:
            name = s["name"]["full"]
            occ = ", ".join(s.get("primaryOccupations") or [])[:25]
            favs = s.get("favourites", 0)
            b.button(text=f"{name} — {occ}  ❤️{favs}", callback_data=f"staffperson:{s['id']}")
        b.adjust(1)
        await send_text(t(uid, "search_results", q=q, page=page, total=pinfo.get("lastPage", 1)),
                        parse_mode="MarkdownV2", reply_markup=b.as_markup())


# ─── FUZZY SEARCH ─────────────────────────────────────────────────────────────

@router.message(SearchState.fuzzy_query)
async def process_fuzzy(msg: Message, state: FSMContext):
    uid = msg.from_user.id
    q = msg.text.strip()
    await state.clear()

    if not fuzzy_engine.available:
        await msg.answer("⚠️ Fuzzy search database not found\\. Switching to regular search\\.", parse_mode="MarkdownV2")
        await do_search(msg, q, "ANIME", 1, uid)
        return

    results = fuzzy_engine.search(q, threshold=0.60, limit=10)
    if not results:
        await msg.answer(t(uid, "search_empty", q=q), parse_mode="MarkdownV2")
        return

    kb = fuzzy_results_kb(results)
    from core.formatters import esc
    await msg.answer(t(uid, "search_fuzzy_results", q=esc(q)), parse_mode="MarkdownV2", reply_markup=kb)


# ─── FILTER ──────────────────────────────────────────────────────────────────

_filter_state: dict = {}


@router.callback_query(F.data == "openfilter")
async def open_filter(cb: CallbackQuery):
    uid = cb.from_user.id
    fs = _filter_state.get(uid, {})
    g, y, s = fs.get("genre"), fs.get("year"), fs.get("score")
    from core.formatters import esc
    params = (
        f"  🏷 {GENRE_DISPLAY.get(g, g) if g else t(uid, 'filter_none')}\n"
        f"  📅 {y if y else t(uid, 'filter_none')}\n"
        f"  ⭐ {s if s else t(uid, 'filter_none')}"
    )
    await cb.message.answer(
        t(uid, "filter_title", params=esc(params)),
        parse_mode="MarkdownV2",
        reply_markup=filter_kb(uid, g, y, s)
    )
    await cb.answer()


@router.callback_query(F.data.startswith("filter:pick:"))
async def filter_pick(cb: CallbackQuery):
    uid = cb.from_user.id
    field = cb.data.split(":")[2]
    if field == "genre":
        await cb.message.answer(t(uid, "filter_select_genre"), parse_mode="MarkdownV2",
                                reply_markup=filter_pick_genre_kb(uid))
    elif field == "year":
        await cb.message.answer(t(uid, "filter_select_year"), parse_mode="MarkdownV2",
                                reply_markup=filter_pick_year_kb(uid))
    elif field == "score":
        await cb.message.answer(t(uid, "filter_select_score"), parse_mode="MarkdownV2",
                                reply_markup=filter_pick_score_kb(uid))
    await cb.answer()


@router.callback_query(F.data.startswith("filter:set"))
async def filter_set(cb: CallbackQuery):
    uid = cb.from_user.id
    parts = cb.data.split(":", 3)
    field_cmd = parts[1]
    val = parts[2] if len(parts) > 2 else None

    if uid not in _filter_state:
        _filter_state[uid] = {}

    if field_cmd == "setgenre":
        _filter_state[uid]["genre"] = None if val == "__none__" else val
    elif field_cmd == "setyear":
        _filter_state[uid]["year"] = None if val == "__none__" else val
    elif field_cmd == "setscore":
        _filter_state[uid]["score"] = None if val == "__none__" else val

    await cb.answer("✅ Set!")
    fs = _filter_state.get(uid, {})
    g, y, s = fs.get("genre"), fs.get("year"), fs.get("score")
    from core.formatters import esc
    params = (
        f"  🏷 {GENRE_DISPLAY.get(g, g) if g else t(uid, 'filter_none')}\n"
        f"  📅 {y if y else t(uid, 'filter_none')}\n"
        f"  ⭐ {s if s else t(uid, 'filter_none')}"
    )
    await cb.message.answer(
        t(uid, "filter_title", params=esc(params)),
        parse_mode="MarkdownV2",
        reply_markup=filter_kb(uid, g, y, s)
    )


@router.callback_query(F.data == "filter:reset")
async def filter_reset(cb: CallbackQuery):
    uid = cb.from_user.id
    _filter_state[uid] = {}
    await cb.answer("🔄 Reset!")
    await open_filter(cb)


@router.callback_query(F.data == "filter:dosearch")
async def filter_do_search(cb: CallbackQuery):
    uid = cb.from_user.id
    fs = _filter_state.get(uid, {})
    g, y, s = fs.get("genre"), fs.get("year"), fs.get("score")

    if not any([g, y, s]):
        await cb.answer(t(uid, "filter_no_params"), show_alert=True)
        return

    if not filter_engine.available:
        await cb.answer("⚠️ Filter database not available. Please add anime_db/ folder.", show_alert=True)
        return

    results = filter_engine.search(genre=g, year=y, score_range=s, limit=100)

    if not results:
        await cb.message.answer(t(uid, "filter_empty"), parse_mode="MarkdownV2")
        await cb.answer()
        return

    _filter_state[uid]["results"] = results
    _filter_state[uid]["results_page"] = 1

    await _show_filter_results(cb.message, uid, results, 1)
    await cb.answer()


@router.callback_query(F.data.startswith("filterpage:"))
async def filter_page_cb(cb: CallbackQuery):
    uid = cb.from_user.id
    page = int(cb.data.split(":")[1])
    results = _filter_state.get(uid, {}).get("results", [])
    await _show_filter_results(cb.message, uid, results, page)
    await cb.answer()


async def _show_filter_results(target, uid: int, results: list, page: int):
    per_page = 8
    total = len(results)
    start = (page - 1) * per_page
    has_prev = page > 1
    has_next = (start + per_page) < total
    await target.answer(
        t(uid, "filter_results", count=total),
        parse_mode="MarkdownV2",
        reply_markup=filter_results_kb(uid, results, page, has_prev, has_next)
    )
