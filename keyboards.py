from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from locales.i18n import t


def btn(text: str, callback_data: str, style: str = None) -> InlineKeyboardButton:
    kwargs = {"text": text, "callback_data": callback_data}
    if style:
        kwargs["style"] = style
    return InlineKeyboardButton(**kwargs)


DEFAULT_LAYOUT = [
    ["menu_search", "menu_mylist"],
    ["menu_trending", "menu_schedule"],
    ["menu_season", "menu_profile"],
    ["menu_settings"],
]

ALL_BUTTONS = {
    "menu_search":   "🔍",
    "menu_mylist":   "📋",
    "menu_trending": "🔥",
    "menu_schedule": "🗓",
    "menu_season":   "🌸",
    "menu_profile":  "👤",
    "menu_settings": "⚙️",
}


def main_menu(uid: int) -> ReplyKeyboardMarkup:
    from storage import get_keyboard_layout
    layout = get_keyboard_layout(uid) or DEFAULT_LAYOUT
    keyboard = []
    for row_keys in layout:
        row = [KeyboardButton(text=t(uid, key)) for key in row_keys if key in ALL_BUTTONS]
        if row:
            keyboard.append(row)
    if not keyboard:
        keyboard = [[KeyboardButton(text=t(uid, "menu_search"))]]
    return ReplyKeyboardMarkup(resize_keyboard=True, keyboard=keyboard)


def keyboard_customizer_kb(uid: int, current_layout: list) -> InlineKeyboardMarkup:
    from storage import get_keyboard_layout
    layout = get_keyboard_layout(uid) or DEFAULT_LAYOUT
    active_keys = {k for row in layout for k in row}
    b = InlineKeyboardBuilder()
    for key, icon in ALL_BUTTONS.items():
        label_text = t(uid, key)
        is_active = key in active_keys
        mark = "✅ " if is_active else "☐ "
        b.add(btn(f"{mark}{label_text}", f"kb_toggle:{key}"))
    b.add(btn("✅ Сохранить" if uid else "✅ Save", "kb_save", "success"))
    b.add(btn("🔄 Сбросить", "kb_reset", "danger"))
    b.adjust(2, 2, 2, 1, 2)
    return b.as_markup()


def search_menu_kb(uid: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.add(btn(t(uid, "search_anime_btn"), "searchtype:ANIME"))
    b.add(btn(t(uid, "search_manga_btn"), "searchtype:MANGA"))
    b.add(btn(t(uid, "search_char_btn"), "searchtype:CHARACTER"))
    b.add(btn(t(uid, "search_staff_btn"), "searchtype:STAFF"))
    b.add(btn(t(uid, "search_fuzzy_btn"), "searchtype:FUZZY"))
    b.add(btn(t(uid, "search_filter_btn"), "openfilter"))
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
        b.add(btn(f"{title}  [{fmt}] ⭐{score}", f"media:{item['id']}"))
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(btn("◀️ " + t(uid, "search_page_prev"), f"sp:{q}:{mtype}:{page-1}"))
    if has_next:
        nav.append(btn(t(uid, "search_page_next") + " ▶️", f"sp:{q}:{mtype}:{page+1}"))
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
        b.add(btn(label, f"media:{aid}"))
    b.adjust(1)
    return b.as_markup()


def media_kb(uid: int, media_id: int, mtype: str, in_list: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    if in_list:
        b.add(btn(t(uid, "edit_list"), f"liststatus:{media_id}:{mtype}"))
    else:
        b.add(btn(t(uid, "add_to_list"), f"liststatus:{media_id}:{mtype}", "success"))
    b.add(btn(t(uid, "to_fav"), f"togglefav:{media_id}:{mtype}"))
    b.add(btn(t(uid, "characters_btn"), f"chars:{media_id}:1"))
    b.add(btn(t(uid, "staff_btn"), f"stafflist:{media_id}:1"))
    b.add(btn(t(uid, "related_btn"), f"related:{media_id}"))
    b.add(btn(t(uid, "recs_btn"), f"recs:{media_id}"))
    if in_list:
        b.add(btn(t(uid, "progress_btn"), f"progress:{media_id}", "success"))
        b.add(btn(t(uid, "progress_minus_btn"), f"progress_minus:{media_id}"))
        b.add(btn(t(uid, "rate_btn"), f"rate:{media_id}"))
        b.add(btn(t(uid, "notes_btn"), f"notes:{media_id}"))
    b.adjust(2, 2, 2, 2, 2)
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
        b.add(btn(f"{mark}{t(uid, key)}", f"setstatus:{media_id}:{val}"))
    b.add(btn(t(uid, "delete_from_list"), f"dellist:{media_id}", "danger"))
    b.adjust(2, 2, 2, 1)
    return b.as_markup()


def score_kb(media_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for s in [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]:
        stars = "⭐" * min(s, 5)
        b.add(btn(f"{s} {stars}", f"setscore:{media_id}:{s}"))
    b.add(btn("✖️ Remove score", f"setscore:{media_id}:0", "danger"))
    b.adjust(5)
    return b.as_markup()


def chars_kb(uid: int, edges: list, media_id: int, page: int, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for e in edges:
        char = e["node"]
        role_icon = "⭐ " if e["role"] == "MAIN" else "· "
        name = char["name"]["full"]
        va_list = e.get("voiceActors", [])
        va = f" 🎙{va_list[0]['name']['full']}" if va_list else ""
        b.add(btn(f"{role_icon}{name}{va}", f"char:{char['id']}"))
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(btn("◀️", f"chars:{media_id}:{page-1}"))
    if has_next:
        nav.append(btn("▶️", f"chars:{media_id}:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(btn(t(uid, "back_to_media"), f"media:{media_id}"))
    return b.as_markup()


def staff_list_kb(uid: int, edges: list, media_id: int, page: int, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for e in edges:
        p = e["node"]
        role = (e.get("role") or "")[:25]
        b.add(btn(f"{p['name']['full']} — {role}", f"staffperson:{p['id']}"))
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(btn("◀️", f"stafflist:{media_id}:{page-1}"))
    if has_next:
        nav.append(btn("▶️", f"stafflist:{media_id}:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(btn(t(uid, "back_to_media"), f"media:{media_id}"))
    return b.as_markup()


def related_kb(uid: int, edges: list, media_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for e in edges:
        n = e["node"]
        title = n["title"].get("english") or n["title"]["romaji"]
        rel = e["relationType"].replace("_", " ").title()
        b.add(btn(f"[{rel}] {title[:30]}", f"media:{n['id']}"))
    b.adjust(1)
    b.row(btn(t(uid, "back_btn"), f"media:{media_id}"))
    return b.as_markup()


def recs_kb(uid: int, nodes: list, media_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for rec in nodes:
        m = rec.get("mediaRecommendation")
        if not m:
            continue
        title = m["title"].get("english") or m["title"]["romaji"]
        score = m.get("averageScore") or 0
        b.add(btn(f"{title[:35]}  ⭐{score}", f"media:{m['id']}"))
    b.adjust(1)
    b.row(btn(t(uid, "back_btn"), f"media:{media_id}"))
    return b.as_markup()


def my_list_menu_kb(uid: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    statuses = [
        ("list_current_anime", "CURRENT"),
        ("list_completed_anime", "COMPLETED"),
        ("list_planning_anime", "PLANNING"),
        ("list_dropped_anime", "DROPPED"),
        ("list_paused_anime", "PAUSED"),
        ("list_repeating_anime", "REPEATING"),
    ]
    for key, val in statuses:
        b.add(btn(t(uid, key), f"mylist:ANIME:{val}:1"))
    b.adjust(2, 2, 2)
    b.row(btn("📚 Manga List", "mylist_tab:MANGA"))
    return b.as_markup()


def my_list_manga_kb(uid: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    statuses = [
        ("list_current_manga", "CURRENT"),
        ("list_completed_manga", "COMPLETED"),
        ("list_planning_anime", "PLANNING"),
        ("list_dropped_anime", "DROPPED"),
        ("list_paused_anime", "PAUSED"),
        ("list_repeating_anime", "REPEATING"),
    ]
    for key, val in statuses:
        b.add(btn(t(uid, key), f"mylist:MANGA:{val}:1"))
    b.adjust(2, 2, 2)
    b.row(btn("📺 Anime List", "mylist_tab:ANIME"))
    return b.as_markup()


def list_entries_kb(uid: int, entries: list, mtype: str, status: str, page: int, has_prev: bool, has_next: bool) -> InlineKeyboardMarkup:
    per_page = 8
    start = (page - 1) * per_page
    page_entries = entries[start:start + per_page]
    b = InlineKeyboardBuilder()
    for e in page_entries:
        media = e.get("media") or {}
        title_obj = media.get("title") or {}
        title = title_obj.get("english") or title_obj.get("romaji") or "?"
        if len(title) > 35:
            title = title[:32] + "…"
        score = e.get("score") or 0
        prog = e.get("progress") or 0
        label = f"{title}  {f'⭐{int(score)}' if score else ''} [{prog}]"
        b.add(btn(label, f"media:{media.get('id', 0)}"))
    b.adjust(1)
    nav = []
    if has_prev:
        nav.append(btn("◀️", f"mylist:{mtype}:{status}:{page-1}"))
    if has_next:
        nav.append(btn("▶️", f"mylist:{mtype}:{status}:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(btn("🔙 " + t(uid, "mylist_title").replace("*", "").replace("📋 ", ""), "mylistmenu"))
    return b.as_markup()


def trending_kb(uid: int, items: list, mtype: str, page: int, has_next: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for item in items:
        title = item["title"].get("english") or item["title"]["romaji"]
        if len(title) > 35:
            title = title[:32] + "…"
        score = item.get("averageScore") or 0
        nep = item.get("nextAiringEpisode")
        ep_info = f" ▶️{nep['episode']}" if nep else ""
        b.add(btn(f"{title}  ⭐{score}{ep_info}", f"media:{item['id']}"))
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(btn("◀️", f"trending:{mtype}:{page-1}"))
    if has_next:
        nav.append(btn("▶️", f"trending:{mtype}:{page+1}"))
    if nav:
        b.row(*nav)
    sw = "MANGA" if mtype == "ANIME" else "ANIME"
    sw_label = t(uid, "trending_to_manga") if mtype == "ANIME" else t(uid, "trending_to_anime")
    b.row(btn(sw_label, f"trending:{sw}:1"))
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
        b.add(btn(f"{title}  ⭐{score}{ep_info}", f"media:{item['id']}"))
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(btn("◀️", f"season:{season}:{year}:{page-1}"))
    if has_next:
        nav.append(btn("▶️", f"season:{season}:{year}:{page+1}"))
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
        btn(f"◀ {season_icons[ps]}", f"season:{ps}:{py}:1"),
        btn(f"{season_icons[ns]} ▶", f"season:{ns}:{ny}:1"),
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
        b.add(btn(f"{in_list}Ep.{ep} — {title}", f"media:{media['id']}"))
    b.adjust(1)
    nav = []
    if page > 1:
        nav.append(btn("◀️", f"schedule:{int(upcoming)}:{page-1}"))
    if has_next:
        nav.append(btn("▶️", f"schedule:{int(upcoming)}:{page+1}"))
    if nav:
        b.row(*nav)
    sw_label = t(uid, "schedule_switch_aired") if upcoming else t(uid, "schedule_switch_upcoming")
    b.row(btn(sw_label, f"schedule:{int(not upcoming)}:1"))
    return b.as_markup()


def filter_kb(uid: int, genre=None, year=None, score=None) -> InlineKeyboardMarkup:
    from core.filter import GENRE_DISPLAY
    b = InlineKeyboardBuilder()
    g_label = f"🏷 {GENRE_DISPLAY.get(genre, genre)}" if genre else f"🏷 {t(uid, 'filter_none')}"
    y_label = f"📅 {year}" if year else f"📅 {t(uid, 'filter_none')}"
    s_label = f"⭐ {score}" if score else f"⭐ {t(uid, 'filter_none')}"
    b.add(btn(g_label, "filter:pick:genre"))
    b.add(btn(y_label, "filter:pick:year"))
    b.add(btn(s_label, "filter:pick:score"))
    b.add(btn(t(uid, "filter_reset"), "filter:reset", "danger"))
    b.add(btn(t(uid, "filter_search"), "filter:dosearch", "success"))
    b.adjust(3, 2)
    return b.as_markup()


def filter_pick_genre_kb(uid: int) -> InlineKeyboardMarkup:
    from core.filter import GENRE_DISPLAY
    b = InlineKeyboardBuilder()
    for key, display in GENRE_DISPLAY.items():
        b.add(btn(display, f"filter:setgenre:{key}"))
    b.add(btn("✖️ Clear", "filter:setgenre:__none__", "danger"))
    b.adjust(3)
    return b.as_markup()


def filter_pick_year_kb(uid: int) -> InlineKeyboardMarkup:
    from core.filter import YEARS
    b = InlineKeyboardBuilder()
    for y in YEARS[:20]:
        b.add(btn(y, f"filter:setyear:{y}"))
    b.add(btn("✖️ Clear", "filter:setyear:__none__", "danger"))
    b.adjust(5)
    return b.as_markup()


def filter_pick_score_kb(uid: int) -> InlineKeyboardMarkup:
    from core.filter import SCORE_RANGES
    b = InlineKeyboardBuilder()
    for label in SCORE_RANGES:
        b.add(btn(f"⭐ {label}", f"filter:setscore:{label}"))
    b.add(btn("✖️ Clear", "filter:setscore:__none__", "danger"))
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
        b.add(btn(f"{title}  ⭐{score}", f"media:{aid}"))
    b.adjust(1)
    nav = []
    if has_prev:
        nav.append(btn("◀️", f"filterpage:{page-1}"))
    if has_next:
        nav.append(btn("▶️", f"filterpage:{page+1}"))
    if nav:
        b.row(*nav)
    b.row(btn("🔙 Back to filter", "openfilter"))
    return b.as_markup()


def settings_kb(uid: int) -> InlineKeyboardMarkup:
    from storage import get_lang, get_token
    lang = get_lang(uid)
    token = get_token(uid)
    lang_label = "🇷🇺 Русский" if lang == "ru" else "🇬🇧 English"
    b = InlineKeyboardBuilder()
    b.add(btn(f"🌐 Language: {lang_label}", "settings:lang"))
    b.add(btn("⌨️ Настройка клавиатуры" if lang == "ru" else "⌨️ Customize keyboard", "customize_keyboard"))
    if token:
        from storage import get_notif_settings
        ns = get_notif_settings(uid)
        notif_icon = "🔔" if ns.get("enabled") else "🔕"
        notif_label = (f"{notif_icon} Уведомления" if lang == "ru" else f"{notif_icon} Notifications")
        b.add(btn(notif_label, "settings:notif_menu"))
        b.add(btn("🗑 Сбросить кэш карточки" if lang == "ru" else "🗑 Clear card cache", "settings:clearcache"))
        b.add(btn("🚪 Log out", "logout", "danger"))
    else:
        b.add(btn("🔐 Authorize", "openauth", "success"))
    b.adjust(1)
    return b.as_markup()


def lang_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.add(btn("🇷🇺 Русский", "setlang:ru"))
    b.add(btn("🇬🇧 English", "setlang:en"))
    b.adjust(2)
    return b.as_markup()


def char_kb(uid: int, char_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.add(btn(t(uid, "to_fav"), f"favchar:{char_id}"))
    return b.as_markup()


def staff_person_kb(uid: int, staff_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.add(btn(t(uid, "to_fav"), f"favstaff:{staff_id}"))
    return b.as_markup()


def auth_kb(uid: int, auth_url: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.add(InlineKeyboardButton(text=t(uid, "auth_link_btn"), url=auth_url))
    b.add(btn(t(uid, "auth_manual"), "manual_token"))
    b.adjust(1)
    return b.as_markup()


def auth_menu_kb(uid: int) -> InlineKeyboardMarkup:
    from storage import get_lang
    lang = get_lang(uid)
    card_label = "🪪 Визитка" if lang == "ru" else "🪪 Profile Card"
    b = InlineKeyboardBuilder()
    b.add(btn(card_label, "profile_card"))
    b.add(btn("📊 Wrapped", "wrapped"))
    b.add(btn(t(uid, "logout_btn"), "logout", "danger"))
    b.adjust(2, 1)
    return b.as_markup()


def notif_settings_kb(uid: int) -> InlineKeyboardMarkup:
    from storage import get_lang, get_notif_settings
    lang = get_lang(uid)
    ns = get_notif_settings(uid)

    def tog(val: bool) -> str:
        return "✅" if val else "◻️"

    if lang == "ru":
        rows = [
            (f"{tog(ns['enabled'])} Уведомления вкл/выкл", "notif:toggle:enabled"),
            (f"{tog(ns['airing_watching'])} Новые эпизоды — Смотрю", "notif:toggle:airing_watching"),
            (f"{tog(ns['airing_planned'])} Новые эпизоды — Запланировано", "notif:toggle:airing_planned"),
            (f"{tog(ns['airing_paused'])} Новые эпизоды — На паузе", "notif:toggle:airing_paused"),
            (f"{tog(ns['airing_dropped'])} Новые эпизоды — Брошено", "notif:toggle:airing_dropped"),
            (f"{tog(ns['related_addition'])} Выход продолжений/приквелов", "notif:toggle:related_addition"),
            ("◀️ Назад", "settings"),
        ]
    else:
        rows = [
            (f"{tog(ns['enabled'])} Notifications on/off", "notif:toggle:enabled"),
            (f"{tog(ns['airing_watching'])} New episodes — Watching", "notif:toggle:airing_watching"),
            (f"{tog(ns['airing_planned'])} New episodes — Planned", "notif:toggle:airing_planned"),
            (f"{tog(ns['airing_paused'])} New episodes — On hold", "notif:toggle:airing_paused"),
            (f"{tog(ns['airing_dropped'])} New episodes — Dropped", "notif:toggle:airing_dropped"),
            (f"{tog(ns['related_addition'])} Sequel/prequel releases", "notif:toggle:related_addition"),
            ("◀️ Back", "settings"),
        ]

    b = InlineKeyboardBuilder()
    for label, cb_data in rows:
        b.add(btn(label, cb_data))
    b.adjust(1)
    return b.as_markup()
