from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
from keyboards import btn
from locales.i18n import t

router = Router()

HELP_PAGES = {
    "main": {
        "ru": (
            "📖 *AniList Bot — Помощь*\n\n"
            "Привет\\! Это полноценная замена сайту AniList прямо в Telegram\\.\n\n"
            "*Что умеет бот:*\n"
            "🔍 Поиск аниме, манги, персонажей и стаффа\n"
            "📋 Управление личным списком\n"
            "🔥 Тренды и сезонные новинки\n"
            "🗓 Расписание выхода эпизодов\n"
            "👤 Просмотр профиля AniList\n"
            "🔔 Уведомления о новых эпизодах\n\n"
            "Выбери раздел для подробностей:"
        ),
        "en": (
            "📖 *AniList Bot — Help*\n\n"
            "Hey\\! This is a full AniList replacement right in Telegram\\.\n\n"
            "*What the bot can do:*\n"
            "🔍 Search anime, manga, characters and staff\n"
            "📋 Manage your personal list\n"
            "🔥 Trending and seasonal picks\n"
            "🗓 Airing schedule\n"
            "👤 View your AniList profile\n"
            "🔔 Episode notifications\n\n"
            "Choose a section for details:"
        ),
    },
    "search": {
        "ru": (
            "🔍 *Поиск*\n\n"
            "*Обычный поиск:*\n"
            "Нажми 🔍 Поиск → выбери тип → введи название\n\n"
            "*Inline поиск:*\n"
            "В любом чате напиши `@имя\\_бота название аниме` — результаты появятся сразу\n\n"
            "*Нечёткий поиск 🔮:*\n"
            "Работает даже с опечатками и неточным названием\n\n"
            "*Фильтр 🎯:*\n"
            "Поиск по жанру, году выхода и минимальной оценке"
        ),
        "en": (
            "🔍 *Search*\n\n"
            "*Regular search:*\n"
            "Tap 🔍 Search → choose type → enter name\n\n"
            "*Inline search:*\n"
            "In any chat type `@bot\\_name anime title` — results appear instantly\n\n"
            "*Fuzzy search 🔮:*\n"
            "Works even with typos and approximate titles\n\n"
            "*Filter 🎯:*\n"
            "Search by genre, year and minimum score"
        ),
    },
    "list": {
        "ru": (
            "📋 *Мой список*\n\n"
            "Для управления списком нужна *авторизация* \\(⚙️ Настройки\\)\\.\n\n"
            "*Статусы:*\n"
            "▶️ Смотрю / 📖 Читаю\n"
            "✅ Завершено\n"
            "⏸ Запланировано\n"
            "🔄 Пересматриваю\n"
            "⏹ Брошено\n\n"
            "*На карточке тайтла:*\n"
            "➕ Добавить в список\n"
            "▶️ \\+1 эпизод — быстрый прогресс\n"
            "⭐ Оценить от 1 до 10\n"
            "📝 Добавить заметку"
        ),
        "en": (
            "📋 *My List*\n\n"
            "List management requires *authorization* \\(⚙️ Settings\\)\\.\n\n"
            "*Statuses:*\n"
            "▶️ Watching / 📖 Reading\n"
            "✅ Completed\n"
            "⏸ Planning\n"
            "🔄 Rewatching\n"
            "⏹ Dropped\n\n"
            "*On the title card:*\n"
            "➕ Add to list\n"
            "▶️ \\+1 episode — quick progress\n"
            "⭐ Rate from 1 to 10\n"
            "📝 Add a note"
        ),
    },
    "notify": {
        "ru": (
            "🔔 *Уведомления*\n\n"
            "Бот автоматически проверяет расписание и присылает уведомление когда выходит новый эпизод тайтла из твоего списка\\.\n\n"
            "*Включить/выключить:*\n"
            "⚙️ Настройки → 🔔 Уведомления\n\n"
            "*Когда приходят:*\n"
            "В момент выхода эпизода \\(±1 час\\)\n\n"
            "Требуется авторизация и статус *▶️ Смотрю* у тайтла\\."
        ),
        "en": (
            "🔔 *Notifications*\n\n"
            "The bot automatically checks the schedule and sends a notification when a new episode airs for titles in your list\\.\n\n"
            "*Enable/disable:*\n"
            "⚙️ Settings → 🔔 Notifications\n\n"
            "*When they arrive:*\n"
            "When the episode airs \\(±1 hour\\)\n\n"
            "Requires authorization and *▶️ Watching* status\\."
        ),
    },
}


def help_kb(page: str, lang: str) -> object:
    b = InlineKeyboardBuilder()
    if page == "main":
        b.row(
            btn("🔍 Поиск" if lang == "ru" else "🔍 Search", "help:search"),
            btn("📋 Список" if lang == "ru" else "📋 List", "help:list"),
        )
        b.row(
            btn("🔔 Уведомления" if lang == "ru" else "🔔 Notifications", "help:notify"),
        )
    else:
        b.row(btn("◀️ Назад" if lang == "ru" else "◀️ Back", "help:main"))
    return b.as_markup()


@router.message(Command("help"))
async def help_cmd(msg: Message):
    from storage import get_lang
    uid = msg.from_user.id
    lang = get_lang(uid)
    text = HELP_PAGES["main"][lang]
    await msg.answer(text, parse_mode="MarkdownV2", reply_markup=help_kb("main", lang))


@router.callback_query(F.data.startswith("help:"))
async def help_cb(cb: CallbackQuery):
    from storage import get_lang
    uid = cb.from_user.id
    lang = get_lang(uid)
    page = cb.data.split(":")[1]
    text = HELP_PAGES.get(page, HELP_PAGES["main"])[lang]
    try:
        await cb.message.edit_text(text, parse_mode="MarkdownV2", reply_markup=help_kb(page, lang))
    except Exception:
        await cb.message.answer(text, parse_mode="MarkdownV2", reply_markup=help_kb(page, lang))
    await cb.answer()


async def send_onboarding(msg: Message):
    from storage import get_lang
    uid = msg.from_user.id
    lang = get_lang(uid)
    text_ru = (
        "👋 *Добро пожаловать\\!*\n\n"
        "Это бот для работы с AniList — твой аниме дневник прямо в Telegram\\.\n\n"
        "Для полного доступа авторизуйся:\n"
        "⚙️ *Настройки* → *🔐 Авторизация*\n\n"
        "Без авторизации доступен поиск, тренды и расписание\\.\n\n"
        "Напиши /help чтобы узнать все возможности бота\\."
    )
    text_en = (
        "👋 *Welcome\\!*\n\n"
        "This is an AniList bot — your anime diary right in Telegram\\.\n\n"
        "For full access, authorize yourself:\n"
        "⚙️ *Settings* → *🔐 Auth*\n\n"
        "Search, trending and schedule are available without authorization\\.\n\n"
        "Type /help to learn all bot features\\."
    )
    text = text_ru if lang == "ru" else text_en
    await msg.answer(text, parse_mode="MarkdownV2")
