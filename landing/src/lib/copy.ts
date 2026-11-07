import { aired, featured, type Locale } from "@/lib/site";

export interface ChatScreen {
  preview?: boolean;
  lines: string[];
  keys: string[][];
  tap?: [number, number];
  toast?: string;
}

export interface Step {
  title: string;
  body: string;
}

const listed = aired.slice(1, 4);

function progress(ep: number, total: number | null): string {
  return `${Math.max(ep - 1, 0)}/${total ?? "?"}`;
}

const en = {
  meta: {
    title: "AniList for Telegram",
    description: "Track anime and manga, rate titles and get episode alerts inside Telegram. A bot, a full Mini App and shareable profile cards.",
  },
  nav: {
    bot: "Bot",
    alerts: "Alerts",
    app: "Mini App",
    cards: "Cards",
    source: "Open source",
    open: "Open in Telegram",
    github: "GitHub",
    language: "Русский",
    languageShort: "RU",
  },
  hero: {
    eyebrow: "Unofficial AniList client for Telegram",
    words: ["Your", "AniList,", "inside", "Telegram"],
    lede: "Track anime and manga, rate titles in your own score format and get a message the minute an episode airs. A bot, a full Mini App and shareable cards, in English and Russian.",
    primary: "Open the bot",
    secondary: "View source",
    meta: ["Free", "English and Russian", "Open source"],
  },
  alert: {
    head: "New episode!",
    body: (ep: number, total: number | null) => (total ? `Episode ${ep} of ${total} is out` : `Episode ${ep} is out`),
    mark: (ep: number) => `✓ Mark episode ${ep}`,
    open: "📋 Open",
    now: "now",
  },
  bot: {
    index: "01",
    label: "Bot",
    title: "One message that keeps up with you",
    lede: "Every menu is a screen that edits itself in place. Back works even after a restart, and your chat stays one message long.",
    name: "AniList",
    tag: "bot",
    edited: "edited",
    count: (n: number) => (n === 0 ? "1 message" : `1 message · edited ${n}×`),
    steps: [
      { title: "Home", body: "Your stats, what you are behind on and the next episode, at a glance." },
      { title: "My list", body: "Tap a button and the same message turns into your list." },
      { title: "A title", body: "Cover art, score, genres and your progress, with every action one tap away." },
      { title: "+1 episode", body: "Progress saves to AniList and the screen updates without a new message." },
    ] satisfies Step[],
    screens: [
      {
        lines: [
          "Welcome back, **West**!",
          "📺 214 anime · 63 days · ★ 8.4 · 📚 37 manga",
          "▶️ Watching: 6 · behind on: 2",
          "",
          "**Up next:**",
          `${aired[0].title}`,
          `episode ${aired[0].episode + 1} in 2h 14m`,
        ],
        keys: [["🔍 Search", "📋 My List"], ["🔥 Trending", "🗓 Schedule"], ["📱 Open AniList App"]],
        tap: [0, 1],
      },
      {
        lines: [
          "**📋 My list · Watching** (6)",
          "",
          `1. ${featured.title} · 11/${featured.episodes}`,
          ...listed.map((item, index) => `${index + 2}. ${item.title} · ${progress(item.episode, item.episodes)}`),
          "",
          "⏳ Behind on 2 airing titles",
        ],
        keys: [["Frieren: Beyond Journey’s End"], ...listed.slice(0, 2).map((item) => [item.title]), ["‹ Back", "🏠 Menu"]],
        tap: [0, 0],
      },
      {
        preview: true,
        lines: [
          `**${featured.title}**`,
          `TV · ${featured.episodes} eps · ${featured.year} · ★ ${(featured.score / 10).toFixed(1)} · #1 all time`,
          "Adventure · Drama · Fantasy",
          "",
          `▶️ Watching · 11/${featured.episodes} · your score 9.5`,
        ],
        keys: [["➕ 1 episode", "★ Rate"], ["👥 Characters", "🔗 Relations"], ["‹ Back", "🏠 Menu"]],
        tap: [0, 0],
      },
      {
        preview: true,
        lines: [
          `**${featured.title}**`,
          `TV · ${featured.episodes} eps · ${featured.year} · ★ ${(featured.score / 10).toFixed(1)} · #1 all time`,
          "Adventure · Drama · Fantasy",
          "",
          `▶️ Watching · 12/${featured.episodes} · your score 9.5`,
        ],
        keys: [["➕ 1 episode", "★ Rate"], ["👥 Characters", "🔗 Relations"], ["‹ Back", "🏠 Menu"]],
        toast: `Progress: 12/${featured.episodes}`,
      },
    ] satisfies ChatScreen[],
  },
  alerts: {
    index: "02",
    label: "Alerts",
    title: "Alerts for episodes that actually aired",
    lede: "The bot checks the AniList schedule every 5 minutes and writes only once an episode is out. Never early, never twice.",
    facts: [
      ["Every 5 min", "Schedule checked against AniList"],
      ["Once", "Each episode, deduplicated in the database"],
      ["Sequels", "New seasons and spin-offs of what you watched"],
      ["Social", "AniList follows, likes and replies"],
    ],
    live: "Live",
  },
  app: {
    index: "03",
    label: "Mini App",
    title: "All of AniList in one window",
    lede: "The Mini App opens from the chat already signed in: trending, search with filters, the weekly schedule, a full entry editor and your statistics.",
    shots: [
      ["Home", "Trending and what airs today"],
      ["Title", "Everything about a title"],
      ["Search", "Filters by genre, year and format"],
      ["Profile", "Statistics and favourites"],
      ["Library", "Your lists, sorted your way"],
      ["Editor", "Status, score, dates and notes"],
      ["Schedule", "The week, by airing time"],
    ],
  },
  cards: {
    index: "04",
    label: "Cards",
    title: "A profile card worth sending",
    lede: "A persistent Chromium renders your profile card and a story-sized AniList Wrapped from full-size art, cached by content hash.",
    figures: [
      ["2400 px", "Card width, crisp after Telegram compression"],
      ["< 1 s", "To render, down from 8 seconds"],
      ["9:16", "Wrapped, sized for stories"],
    ],
    cardAlt: "Profile card with statistics and favourites",
    wrappedAlt: "AniList Wrapped story card",
  },
  details: {
    index: "05",
    label: "Details",
    title: "The small things, done properly",
    score: {
      title: "Your score format",
      body: "Scores are stored in 100 points and shown the way you set up AniList.",
      formats: ["100 points", "10.0 decimal", "10 points", "5 stars", "3 faces"],
    },
    lang: {
      title: "English and Russian",
      body: "Bot, Mini App, cards and the command menu follow your language.",
      pairs: [
        ["New episode!", "Новая серия!"],
        ["Watching", "Смотрю"],
        ["Profile card", "Карточка профиля"],
        ["Airing schedule", "Расписание серий"],
      ],
    },
    inline: {
      title: "Inline mode",
      body: "Share any anime, what you are watching or your card in any chat.",
      chat: "Any chat",
    },
    login: {
      title: "One-tap login",
      body: "OAuth with a confirmation page that shows both accounts before linking. No codes to copy.",
      alt: "Login confirmation page",
    },
  },
  source: {
    index: "06",
    label: "Open source",
    title: "Open source, built to be read",
    lede: "A monorepo with a typed Python backend, a Next.js Mini App, Alembic migrations and CI on every push.",
    stack: [
      ["Bot", "Python 3.12 · aiogram 3"],
      ["API", "aiohttp · persisted GraphQL operations"],
      ["Data", "PostgreSQL 16 · SQLAlchemy 2 · Alembic"],
      ["Mini App", "Next.js 16 · React 19 · Tailwind 4"],
      ["Cards", "Persistent Chromium · Playwright"],
      ["AniList", "27 requests a minute · TTL cache"],
    ],
    cta: "Read the code",
  },
  final: {
    title: "Your list is one message away",
    lede: "Open the bot, connect AniList in one tap and keep watching.",
    primary: "Open the bot",
  },
  footer: {
    note: "Not affiliated with AniList. Data from the AniList API.",
    made: "Made by Westyasha",
  },
};

export type Copy = typeof en;

const ru: Copy = {
  meta: {
    title: "AniList для Telegram",
    description: "Список аниме и манги, оценки и уведомления о новых сериях прямо в Telegram. Бот, полноценное Mini App и карточки профиля.",
  },
  nav: {
    bot: "Бот",
    alerts: "Уведомления",
    app: "Mini App",
    cards: "Карточки",
    source: "Код",
    open: "Открыть в Telegram",
    github: "GitHub",
    language: "English",
    languageShort: "EN",
  },
  hero: {
    eyebrow: "Неофициальный клиент AniList для Telegram",
    words: ["Твой", "AniList", "прямо", "в Telegram"],
    lede: "Веди список аниме и манги, ставь оценки в своём формате и получай сообщение в ту же минуту, как вышла серия. Бот, полноценное Mini App и карточки на русском и английском.",
    primary: "Открыть бота",
    secondary: "Исходный код",
    meta: ["Бесплатно", "Русский и английский", "Открытый код"],
  },
  alert: {
    head: "Новая серия!",
    body: (ep: number, total: number | null) => (total ? `Вышла серия ${ep} из ${total}` : `Вышла серия ${ep}`),
    mark: (ep: number) => `✓ Отметить серию ${ep}`,
    open: "📋 Открыть",
    now: "сейчас",
  },
  bot: {
    index: "01",
    label: "Бот",
    title: "Одно сообщение, которое успевает за тобой",
    lede: "Каждое меню — экран, который меняется на месте. Кнопка «Назад» работает даже после перезапуска, а чат остаётся длиной в одно сообщение.",
    name: "AniList",
    tag: "бот",
    edited: "изменено",
    count: (n: number) => (n === 0 ? "1 сообщение" : `1 сообщение · изменено ${n}×`),
    steps: [
      { title: "Главная", body: "Статистика, что ты не досмотрел и когда следующая серия — с одного взгляда." },
      { title: "Мой список", body: "Нажимаешь кнопку, и то же сообщение превращается в список." },
      { title: "Тайтл", body: "Обложка, оценка, жанры и прогресс, а все действия в одно касание." },
      { title: "+1 серия", body: "Прогресс сохраняется в AniList, а экран обновляется без нового сообщения." },
    ],
    screens: [
      {
        lines: [
          "С возвращением, **West**!",
          "📺 214 аниме · 63 дн. · ★ 8.4 · 📚 37 манги",
          "▶️ Смотрю: 6 · отстаю: 2",
          "",
          "**Ближайшие серии:**",
          `${aired[0].title}`,
          `серия ${aired[0].episode + 1} через 2 ч 14 мин`,
        ],
        keys: [["🔍 Поиск", "📋 Мой список"], ["🔥 Тренды", "🗓 Расписание"], ["📱 Открыть AniList App"]],
        tap: [0, 1],
      },
      {
        lines: [
          "**📋 Мой список · Смотрю** (6)",
          "",
          `1. ${featured.title} · 11/${featured.episodes}`,
          ...listed.map((item, index) => `${index + 2}. ${item.title} · ${progress(item.episode, item.episodes)}`),
          "",
          "⏳ Отстаёшь в 2 онгоингах",
        ],
        keys: [["Frieren: Beyond Journey’s End"], ...listed.slice(0, 2).map((item) => [item.title]), ["‹ Назад", "🏠 Меню"]],
        tap: [0, 0],
      },
      {
        preview: true,
        lines: [
          `**${featured.title}**`,
          `TV · ${featured.episodes} эп. · ${featured.year} · ★ ${(featured.score / 10).toFixed(1)} · #1 за всё время`,
          "Приключения · Драма · Фэнтези",
          "",
          `▶️ Смотрю · 11/${featured.episodes} · твоя оценка 9.5`,
        ],
        keys: [["➕ 1 серия", "★ Оценка"], ["👥 Персонажи", "🔗 Связанные"], ["‹ Назад", "🏠 Меню"]],
        tap: [0, 0],
      },
      {
        preview: true,
        lines: [
          `**${featured.title}**`,
          `TV · ${featured.episodes} эп. · ${featured.year} · ★ ${(featured.score / 10).toFixed(1)} · #1 за всё время`,
          "Приключения · Драма · Фэнтези",
          "",
          `▶️ Смотрю · 12/${featured.episodes} · твоя оценка 9.5`,
        ],
        keys: [["➕ 1 серия", "★ Оценка"], ["👥 Персонажи", "🔗 Связанные"], ["‹ Назад", "🏠 Меню"]],
        toast: `Прогресс: 12/${featured.episodes}`,
      },
    ],
  },
  alerts: {
    index: "02",
    label: "Уведомления",
    title: "Уведомления о сериях, которые правда вышли",
    lede: "Бот сверяется с расписанием AniList каждые 5 минут и пишет только когда серия уже вышла. Без спешки и без повторов.",
    facts: [
      ["Каждые 5 мин", "Проверка расписания AniList"],
      ["Один раз", "Каждая серия, без дублей в базе"],
      ["Продолжения", "Новые сезоны и спин-оффы того, что ты смотрел"],
      ["Активность", "Подписки, лайки и ответы с AniList"],
    ],
    live: "В эфире",
  },
  app: {
    index: "03",
    label: "Mini App",
    title: "Весь AniList в одном окне",
    lede: "Mini App открывается из чата сразу с твоим аккаунтом: тренды, поиск с фильтрами, расписание недели, полный редактор записи и статистика.",
    shots: [
      ["Главная", "Тренды и что выходит сегодня"],
      ["Тайтл", "Всё о тайтле на одном экране"],
      ["Поиск", "Фильтры по жанру, году и формату"],
      ["Профиль", "Статистика и избранное"],
      ["Библиотека", "Списки с удобной сортировкой"],
      ["Редактор", "Статус, оценка, даты и заметки"],
      ["Расписание", "Неделя по времени выхода"],
    ],
  },
  cards: {
    index: "04",
    label: "Карточки",
    title: "Карточка профиля, которой хочется поделиться",
    lede: "Постоянно запущенный Chromium рисует карточку профиля и AniList Wrapped для сторис из полноразмерных артов и кэширует результат по хэшу.",
    figures: [
      ["2400 px", "Ширина карточки — чёткая даже после сжатия Telegram"],
      ["< 1 с", "На отрисовку вместо прежних 8 секунд"],
      ["9:16", "Wrapped в формате сторис"],
    ],
    cardAlt: "Карточка профиля со статистикой и избранным",
    wrappedAlt: "Карточка AniList Wrapped для сторис",
  },
  details: {
    index: "05",
    label: "Детали",
    title: "Мелочи, сделанные как надо",
    score: {
      title: "Твой формат оценок",
      body: "Оценки хранятся в 100-балльной шкале и показываются так, как ты настроил AniList.",
      formats: ["100 баллов", "10.0 с десятыми", "10 баллов", "5 звёзд", "3 смайлика"],
    },
    lang: {
      title: "Русский и английский",
      body: "Бот, Mini App, карточки и меню команд говорят на твоём языке.",
      pairs: [
        ["Новая серия!", "New episode!"],
        ["Смотрю", "Watching"],
        ["Карточка профиля", "Profile card"],
        ["Расписание серий", "Airing schedule"],
      ],
    },
    inline: {
      title: "Инлайн-режим",
      body: "Делись любым аниме, тем, что смотришь, или своей карточкой в любом чате.",
      chat: "Любой чат",
    },
    login: {
      title: "Вход в одно касание",
      body: "OAuth со страницей подтверждения, где видны оба аккаунта. Никаких кодов для копирования.",
      alt: "Страница подтверждения входа",
    },
  },
  source: {
    index: "06",
    label: "Код",
    title: "Открытый код, который приятно читать",
    lede: "Монорепозиторий: типизированный бэкенд на Python, Mini App на Next.js, миграции Alembic и CI на каждый пуш.",
    stack: [
      ["Бот", "Python 3.12 · aiogram 3"],
      ["API", "aiohttp · persisted GraphQL operations"],
      ["Данные", "PostgreSQL 16 · SQLAlchemy 2 · Alembic"],
      ["Mini App", "Next.js 16 · React 19 · Tailwind 4"],
      ["Карточки", "Постоянный Chromium · Playwright"],
      ["AniList", "27 запросов в минуту · TTL-кэш"],
    ],
    cta: "Смотреть код",
  },
  final: {
    title: "Твой список в одном сообщении",
    lede: "Открой бота, подключи AniList в одно касание и смотри дальше.",
    primary: "Открыть бота",
  },
  footer: {
    note: "Не связано с AniList. Данные из AniList API.",
    made: "Сделал Westyasha",
  },
};

export const COPY: Record<Locale, Copy> = { en, ru };
