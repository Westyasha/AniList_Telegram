from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from locales.i18n import t


def main_menu(uid: int) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(resize_keyboard=True, keyboard=[
        [KeyboardButton(text=t(uid, "menu_search")), KeyboardButton(text=t(uid, "menu_mylist"))],
        [KeyboardButton(text=t(uid, "menu_trending")), KeyboardButton(text=t(uid, "menu_schedule"))],
        [KeyboardButton(text=t(uid, "menu_season")), KeyboardButton(text=t(uid, "menu_profile"))],
        [KeyboardButton(text=t(uid, "menu_settings"))],
    ])


def search_menu_kb(uid: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(uid, "search_anime_btn"), callback_data="searchtype:ANIME")
    b.button(text=t(uid, "search_manga_btn"), callback_data="searchtype:MANGA")
    b.button(text=t(uid, "search_char_btn"), callback_data="searchtype:CHARACTER")
    b.button(text=t(uid, "search_staff_btn"), callback_data="searchtype:STAFF")
    b.button(text=t(uid, "search_fuzzy_btn"), callback_data="searchtype:FUZZY")
    b.button(text=t(uid, "search_filter_btn"), callback_data="openfilter")
    b.adjust(2, 2, 2)
    return b.as_markup()


def search_results_kb(uid: int, results: list, page: int, has_next: bool, q: str, mtype: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for item in results:
        ti = item["title"]
        title = ti.get("english") or ti.get("romaji") or "?"
        if len(title) > 35:
            title = title[:32] + "…"
        fmt = item.get("format", "") or ""
        score = item.get("averageScore") or 0
        b.button(text=f"{title}  [{fmt}] ⭐{score}", callback_data=f"media:{item['id']}")
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text=t(uid, "search_page_prev"), callback_data=f"sp:{q}:{mtype}:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text=t(uid, "search_page_next"), callback_data=f"sp:{q}:{mtype}:{page+1}"))
    if nav:
        b.row(*nav)
    return b.as_markup()


def fuzzy_results_kb(results: list) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for item in results:
        title = item.get("name_romaji") or item.get("title", {}).get("romaji") or str(item.get("id", "?"))
        score = item.get("averageScore") or item.get("average_score") or 0
        acc = item.get("_score", "")
        aid = item.get("id") or item.get("anilist_id")
        if not aid:
            continue
        label = f"{title[:35]}  ⭐{score}" + (f"  [{acc}%]" if acc else "")
        b.button(text=label, callback_data=f"media:{aid}")
    b.adjust(1)
    return b.as_markup()


def media_kb(uid: int, media_id: int, mtype: str, in_list: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    list_label = t(uid, "edit_list") if in_list else t(uid, "add_to_list")
    b.button(text=list_label, callback_data=f"liststatus:{media_id}:{mtype}")
    b.button(text=t(uid, "to_fav"), callback_data=f"togglefav:{media_id}:{mtype}")
    b.button(text=t(uid, "characters_btn"), callback_data=f"chars:{media_id}:1")
    b.button(text=t(uid, "staff_btn"), callback_data=f"stafflist:{media_id}:1")
    b.button(text=t(uid, "related_btn"), callback_data=f"related:{media_id}")
    b.button(text=t(uid, "recs_btn"), callback_data=f"recs:{media_id}")
    if in_list:
        b.button(text=t(uid, "progress_btn"), callback_data=f"progress:{media_id}")
        b.button(text=t(uid, "rate_btn"), callback_data=f"rate:{media_id}")
        b.button(text=t(uid, "notes_btn"), callback_data=f"notes:{media_id}")
    b.adjust(2, 2, 2, 3)
    return b.as_markup()


def list_status_kb(uid: int, media_id: int, current: str = None) -> InlineKeyboardMarkup:
    statuses = [
        ("status_current", "CURRENT"),
        ("status_planning", "PLANNING"),
        ("status_completed", "COMPLETED"),
        ("status_dropped", "DROPPED"),
        ("status_paused", "PAUSED"),
        ("status_repeating", "REPEATING"),
    ]
    b = InlineKeyboardBuilder()
    for key, val in statuses:
        mark = "✓ " if val == current else ""
        b.button(text=f"{mark}{t(uid, key)}", callback_data=f"setstatus:{media_id}:{val}")
    b.button(text=t(uid, "delete_from_list"), callback_data=f"dellist:{media_id}")
    b.adjust(2, 2, 2, 1)
    return b.as_markup()


def score_kb(media_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for s in [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]:
        stars = "⭐" * min(s, 5)
        b.button(text=f"{s} {stars}", callback_data=f"setscore:{media_id}:{s}")
    b.button(text="0 — Remove score", callback_data=f"setscore:{media_id}:0")
    b.adjust(5)
    return b.as_markup()


def chars_kb(uid: int, edges: list, media_id: int, page: int, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for e in edges:
        char = e["node"]
        role_icon = "⭐ " if e["role"] == "MAIN" else "· "
        name = char["name"]["full"]
        favs = char.get("favourites", 0)
        va_list = e.get("voiceActors", [])
        va = f" 🎙{va_list[0]['name']['full']}" if va_list else ""
        b.button(text=f"{role_icon}{name}{va}", callback_data=f"char:{char['id']}")
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"chars:{media_id}:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"chars:{media_id}:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(InlineKeyboardButton(text=t(uid, "back_to_media"), callback_data=f"media:{media_id}"))
    return b.as_markup()


def staff_list_kb(uid: int, edges: list, media_id: int, page: int, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for e in edges:
        p = e["node"]
        role = (e.get("role") or "")[:25]
        b.button(text=f"{p['name']['full']} — {role}", callback_data=f"staffperson:{p['id']}")
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"stafflist:{media_id}:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"stafflist:{media_id}:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(InlineKeyboardButton(text=t(uid, "back_to_media"), callback_data=f"media:{media_id}"))
    return b.as_markup()


def related_kb(uid: int, edges: list, media_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for e in edges:
        n = e["node"]
        title = n["title"].get("english") or n["title"]["romaji"]
        rel = e["relationType"].replace("_", " ").title()
        fmt = n.get("format") or ""
        b.button(text=f"[{rel}] {title[:30]}", callback_data=f"media:{n['id']}")
    b.adjust(1)
    b.row(InlineKeyboardButton(text=t(uid, "back_btn"), callback_data=f"media:{media_id}"))
    return b.as_markup()


def recs_kb(uid: int, nodes: list, media_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for rec in nodes:
        m = rec.get("mediaRecommendation")
        if not m:
            continue
        title = m["title"]["romaji"]
        score = m.get("averageScore") or 0
        b.button(text=f"{title[:35]} ⭐{score}", callback_data=f"media:{m['id']}")
    b.adjust(1)
    b.row(InlineKeyboardButton(text=t(uid, "back_btn"), callback_data=f"media:{media_id}"))
    return b.as_markup()


def my_list_menu_kb(uid: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(uid, "list_current_anime"), callback_data="mylist:ANIME:CURRENT:1")
    b.button(text=t(uid, "list_completed_anime"), callback_data="mylist:ANIME:COMPLETED:1")
    b.button(text=t(uid, "list_planning_anime"), callback_data="mylist:ANIME:PLANNING:1")
    b.button(text=t(uid, "list_dropped_anime"), callback_data="mylist:ANIME:DROPPED:1")
    b.button(text=t(uid, "list_paused_anime"), callback_data="mylist:ANIME:PAUSED:1")
    b.button(text=t(uid, "list_repeating_anime"), callback_data="mylist:ANIME:REPEATING:1")
    b.button(text=t(uid, "list_current_manga"), callback_data="mylist:MANGA:CURRENT:1")
    b.button(text=t(uid, "list_completed_manga"), callback_data="mylist:MANGA:COMPLETED:1")
    b.adjust(2)
    return b.as_markup()


def list_entries_kb(uid: int, entries: list, mtype: str, status: str, page: int, has_prev: bool, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    per_page = 8
    start = (page - 1) * per_page
    page_entries = entries[start:start + per_page]
    for e in page_entries:
        title = e["media"]["title"].get("english") or e["media"]["title"]["romaji"]
        if len(title) > 32:
            title = title[:29] + "…"
        prog = e.get("progress") or 0
        total = e["media"].get("episodes") or e["media"].get("chapters") or "?"
        score = f" ⭐{int(e['score'])}" if e.get("score") else ""
        nep = e["media"].get("nextAiringEpisode")
        new_ep = f" 🆕{nep['episode']}" if nep and nep["episode"] > prog else ""
        b.button(text=f"{title} [{prog}/{total}]{score}{new_ep}", callback_data=f"media:{e['mediaId']}")
    b.adjust(1)
    nav = []
    if has_prev:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"mylist:{mtype}:{status}:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"mylist:{mtype}:{status}:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(InlineKeyboardButton(text=t(uid, "list_menu_btn"), callback_data="mylistmenu"))
    return b.as_markup()


def trending_kb(uid: int, items: list, mtype: str, page: int, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for item in items:
        title = item["title"].get("english") or item["title"]["romaji"]
        if len(title) > 35:
            title = title[:32] + "…"
        score = item.get("averageScore") or 0
        trend = item.get("trending") or 0
        b.button(text=f"{title}  ⭐{score} 🔥{trend}", callback_data=f"media:{item['id']}")
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"trending:{mtype}:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"trending:{mtype}:{page+1}"))
    if nav:
        b.row(*nav)
    sw = "MANGA" if mtype == "ANIME" else "ANIME"
    sw_label = t(uid, "trending_to_manga") if mtype == "ANIME" else t(uid, "trending_to_anime")
    b.row(InlineKeyboardButton(text=sw_label, callback_data=f"trending:{sw}:1"))
    return b.as_markup()


def season_kb(uid: int, items: list, season: str, year: int, page: int, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for item in items:
        title = item["title"].get("english") or item["title"]["romaji"]
        if len(title) > 35:
            title = title[:32] + "…"
        score = item.get("averageScore") or 0
        nep = item.get("nextAiringEpisode")
        ep_info = f" ▶️{nep['episode']}" if nep else ""
        b.button(text=f"{title}  ⭐{score}{ep_info}", callback_data=f"media:{item['id']}")
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"season:{season}:{year}:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"season:{season}:{year}:{page+1}"))
    if nav:
        b.row(*nav)

    seasons = ["WINTER", "SPRING", "SUMMER", "FALL"]
    idx = seasons.index(season)
    ps = seasons[(idx - 1) % 4]
    ns = seasons[(idx + 1) % 4]
    py = year - 1 if idx == 0 else year
    ny = year + 1 if idx == 3 else year
    season_icons = {"WINTER": "❄️", "SPRING": "🌸", "SUMMER": "☀️", "FALL": "🍂"}
    b.row(
        InlineKeyboardButton(text=f"◀ {season_icons[ps]}", callback_data=f"season:{ps}:{py}:1"),
        InlineKeyboardButton(text=f"{season_icons[ns]} ▶", callback_data=f"season:{ns}:{ny}:1"),
    )
    return b.as_markup()


def schedule_kb(uid: int, items: list, page: int, has_next: bool, upcoming: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for item in items:
        media = item["media"]
        title = media["title"].get("english") or media["title"]["romaji"]
        if len(title) > 28:
            title = title[:25] + "…"
        ep = item["episode"]
        ml = media.get("mediaListEntry")
        in_list = "📋 " if ml else ""
        b.button(text=f"{in_list}Ep.{ep} — {title}", callback_data=f"media:{media['id']}")
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"schedule:{int(upcoming)}:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"schedule:{int(upcoming)}:{page+1}"))
    if nav:
        b.row(*nav)
    sw_label = t(uid, "schedule_switch_aired") if upcoming else t(uid, "schedule_switch_upcoming")
    b.row(InlineKeyboardButton(text=sw_label, callback_data=f"schedule:{int(not upcoming)}:1"))
    return b.as_markup()


def filter_kb(uid: int, genre=None, year=None, score=None) -> InlineKeyboardMarkup:
    from core.filter import GENRE_DISPLAY, YEARS, SCORE_RANGES
    b = InlineKeyboardBuilder()
    g_label = f"🏷 {GENRE_DISPLAY.get(genre, genre)}" if genre else f"🏷 {t(uid, 'filter_none')}"
    y_label = f"📅 {year}" if year else f"📅 {t(uid, 'filter_none')}"
    s_label = f"⭐ {score}" if score else f"⭐ {t(uid, 'filter_none')}"
    b.button(text=g_label, callback_data="filter:pick:genre")
    b.button(text=y_label, callback_data="filter:pick:year")
    b.button(text=s_label, callback_data="filter:pick:score")
    b.button(text=t(uid, "filter_reset"), callback_data="filter:reset")
    b.button(text=t(uid, "filter_search"), callback_data="filter:dosearch")
    b.adjust(3, 2)
    return b.as_markup()


def filter_pick_genre_kb(uid: int) -> InlineKeyboardMarkup:
    from core.filter import GENRE_DISPLAY
    b = InlineKeyboardBuilder()
    for key, display in GENRE_DISPLAY.items():
        b.button(text=display, callback_data=f"filter:setgenre:{key}")
    b.button(text="✖️ Clear", callback_data="filter:setgenre:__none__")
    b.adjust(3)
    return b.as_markup()


def filter_pick_year_kb(uid: int) -> InlineKeyboardMarkup:
    from core.filter import YEARS
    b = InlineKeyboardBuilder()
    for y in YEARS[:20]:
        b.button(text=y, callback_data=f"filter:setyear:{y}")
    b.button(text="✖️ Clear", callback_data="filter:setyear:__none__")
    b.adjust(5)
    return b.as_markup()


def filter_pick_score_kb(uid: int) -> InlineKeyboardMarkup:
    from core.filter import SCORE_RANGES
    b = InlineKeyboardBuilder()
    for label in SCORE_RANGES:
        b.button(text=f"⭐ {label}", callback_data=f"filter:setscore:{label}")
    b.button(text="✖️ Clear", callback_data="filter:setscore:__none__")
    b.adjust(3)
    return b.as_markup()


def filter_results_kb(uid: int, results: list, page: int, has_prev: bool, has_next: bool) -> InlineKeyboardMarkup:
    per_page = 8
    start = (page - 1) * per_page
    page_entries = results[start:start + per_page]
    b = InlineKeyboardBuilder()
    for item in page_entries:
        title = (item.get("name_romaji") or item.get("name_english") or
                 item.get("title", {}).get("romaji") or "?")
        score = item.get("averageScore") or item.get("average_score") or 0
        aid = item.get("id") or item.get("anilist_id")
        if not aid:
            continue
        if len(title) > 35:
            title = title[:32] + "…"
        b.button(text=f"{title}  ⭐{score}", callback_data=f"media:{aid}")
    b.adjust(1)
    nav = []
    if has_prev:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"filterpage:{page-1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"filterpage:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(InlineKeyboardButton(text="🔙 Back to filter", callback_data="openfilter"))
    return b.as_markup()


def settings_kb(uid: int) -> InlineKeyboardMarkup:
    from storage import get_lang, get_token
    lang = get_lang(uid)
    token = get_token(uid)
    lang_label = "🇷🇺 Русский" if lang == "ru" else "🇬🇧 English"
    b = InlineKeyboardBuilder()
    b.button(text=f"🌐 Language: {lang_label}", callback_data="settings:lang")
    if token:
        b.button(text="👤 My profile", callback_data="myprofile")
        b.button(text="🚪 Log out", callback_data="logout")
    else:
        b.button(text="🔐 Authorize", callback_data="openauth")
    b.adjust(1)
    return b.as_markup()


def lang_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="🇷🇺 Русский", callback_data="setlang:ru")
    b.button(text="🇬🇧 English", callback_data="setlang:en")
    b.adjust(2)
    return b.as_markup()


def char_kb(uid: int, char_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(uid, "to_fav"), callback_data=f"favchar:{char_id}")
    return b.as_markup()


def staff_person_kb(uid: int, staff_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(uid, "to_fav"), callback_data=f"favstaff:{staff_id}")
    return b.as_markup()


def auth_kb(uid: int, auth_url: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(uid, "auth_link_btn"), url=auth_url)
    b.button(text=t(uid, "auth_manual"), callback_data="manual_token")
    b.adjust(1)
    return b.as_markup()


def auth_menu_kb(uid: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(uid, "profile_btn"), callback_data="myprofile")
    b.button(text=t(uid, "logout_btn"), callback_data="logout")
    b.adjust(1)
    return b.as_markup()
