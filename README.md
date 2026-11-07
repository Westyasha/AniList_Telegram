<div align="center">

<img src="docs/assets/banner.jpg" alt="AniList for Telegram" width="100%">

# AniList for Telegram

**A complete AniList client inside Telegram — a fast bot, accurate notifications, shareable cards and a full Mini App.**

[![CI](https://github.com/Westyasha/AniList_Telegram/actions/workflows/ci.yml/badge.svg)](https://github.com/Westyasha/AniList_Telegram/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12-E0233D?logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-E0233D?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-E0233D?logo=nextdotjs&logoColor=white)
![Languages](https://img.shields.io/badge/i18n-EN%20%7C%20RU-E0233D)

[**Open the bot →**](https://t.me/westyasha_AniList_bot)

</div>

---

## Highlights

- **One message, no clutter.** Every bot menu is a screen that edits itself in place, and Back navigation survives restarts.
- **Real list management.** Status, `+1 episode` from anywhere, rewatch counting, notes and removal — with scores in *your* AniList format (100 / 10.0 / 10 / ★5 / 3 faces).
- **Notifications that are right.** Checked every 5 minutes, sent only for episodes that actually aired, deduplicated in the database, per-status toggles, sequel alerts, and AniList follows, likes and replies relayed to Telegram.
- **Crisp cards in under a second.** A persistent Chromium renders a 2400 px profile card and a story-sized AniList Wrapped from prefetched full-size art, cached by content hash.
- **Telegram Mini App.** Home with the trending scene, search with filters, the weekly schedule, a library with a full entry editor, profile statistics and the notification inbox.
- **One-tap login.** OAuth authorization-code flow with a confirmation page that shows both accounts before linking.
- **Fully bilingual.** English and Russian everywhere: bot, cards, Mini App and the command menu.
- **Inline mode.** Share any anime, what you're watching or your profile card in any chat.

## Screenshots

| Home | Title | Profile |
|:---:|:---:|:---:|
| <img src="docs/screenshots/app-home.jpg" width="260"> | <img src="docs/screenshots/app-media.jpg" width="260"> | <img src="docs/screenshots/app-profile.jpg" width="260"> |

| Library | Entry editor | Schedule |
|:---:|:---:|:---:|
| <img src="docs/screenshots/app-library.jpg" width="260"> | <img src="docs/screenshots/app-editor.jpg" width="260"> | <img src="docs/screenshots/app-schedule.jpg" width="260"> |

<div align="center">
<img src="docs/screenshots/card.jpg" width="100%" alt="Profile card">
<br><sub>Profile card, 2400 px</sub>
<br><br>
<img src="docs/screenshots/wrapped.jpg" width="320" alt="AniList Wrapped">
&nbsp;&nbsp;
<img src="docs/screenshots/auth-confirm.jpg" width="520" alt="Login confirmation">
</div>

## Architecture

```mermaid
flowchart LR
    TG[Telegram] -->|updates| BOT[Bot<br/>aiogram 3]
    TG -->|Mini App| WEB[Web<br/>Next.js]
    WEB -->|/api with initData| API[API<br/>aiohttp]
    BOT --> CORE[AniList client<br/>rate limit · cache · dedupe]
    API --> CORE
    NOTIF[Notifier] --> CORE
    CORE --> GQL[(AniList GraphQL)]
    BOT & API & NOTIF --> PG[(PostgreSQL)]
    CARDS[Card renderer<br/>persistent Chromium] --> TG
    NOTIF --> TG
```

```
backend/                 Python 3.12 · aiogram 3 · aiohttp · SQLAlchemy 2 · Alembic
├── app/
│   ├── anilist/         GraphQL client, queries, OAuth, helpers
│   ├── bot/             screen router, screens, handlers, keyboards
│   ├── db/              schema, repositories, FSM storage
│   ├── i18n/            en.toml, ru.toml
│   ├── services/        notifier, cards renderer and templates
│   └── web/             Mini App API, OAuth endpoints
├── migrations/          Alembic migrations
└── tests/               pytest, including PostgreSQL integration tests
web/                     Next.js 16 · React 19 · TypeScript · Tailwind v4 · TanStack Query
├── src/app/             routes: home, search, schedule, library, media, profile, auth
├── src/components/      design system and media components
├── src/features/        screens
└── src/api, src/lib     typed API layer, Telegram SDK wrapper, i18n
deploy/                  systemd units, nginx example, deploy script
docker-compose.yml       postgres + backend + web
```

### Design notes

- **Screens are routes.** Bot callback data like `/m/154587` resolves to a builder that returns `Screen(text, keyboard, image)`. The image is a large link preview above the text, so every screen is a text message that can always be edited in place.
- **Rate limits.** AniList currently allows 30 requests per minute. A shared sliding-window limiter, `Retry-After` handling, response caching and in-flight request deduplication keep the bot and the Mini App inside that budget.
- **Persisted operations.** The Mini App never sends GraphQL: it calls named operations that the backend allow-lists, so tokens stay on the server.
- **Security.** AniList tokens are encrypted at rest (Fernet). Mini App requests are authenticated by validating Telegram `initData` (HMAC-SHA256 with a freshness check). OAuth `state` is a single-use nonce bound to the Telegram user, the pending token waits encrypted in the database, and the confirmation page needs a CSRF token kept in the URL fragment.
- **Design system.** Neutral graphite chrome, color only from cover art, and one signature detail taken from the logo: a 45° facet on posters, primary buttons and the active tab.

## Self-hosting

### Requirements

- Python 3.12+, Node 20.9+, PostgreSQL 14+
- A bot token from [@BotFather](https://t.me/BotFather)
- An AniList API client from [anilist.co/settings/developer](https://anilist.co/settings/developer) with the redirect URL `https://<your-domain>/auth/callback`
- A domain with HTTPS for the Mini App and the OAuth callback

### Docker

```bash
cp backend/.env.example .env
docker compose up -d --build
```

### Local development

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
playwright install chromium
alembic upgrade head
python -m app
```

```bash
cd web
npm install
BACKEND_URL=http://127.0.0.1:8090 npm run dev
```

### Production

The reference setup runs both apps as systemd services behind nginx: requests to `/api/`, `/auth/login` and `/auth/callback` go to the backend, everything else to Next.js. See [`deploy/`](deploy).

```bash
sudo bash deploy/deploy.sh
```

### Configuration

| Variable | Required | Description |
|---|:---:|---|
| `BOT_TOKEN` | ✅ | Telegram bot token |
| `SECRET_KEY` | ✅ | Long random string used to encrypt AniList tokens |
| `ANILIST_CLIENT_ID` | ✅ | AniList API client id |
| `ANILIST_CLIENT_SECRET` | ✅ | AniList API client secret |
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:password@host:5432/db` |
| `ANILIST_REDIRECT_URI` | | `https://<domain>/auth/callback`; the AniList PIN URL enables the copy-code fallback |
| `PUBLIC_URL` | | Public HTTPS origin of the Mini App |
| `WEB_HOST`, `WEB_PORT` | | Backend bind address, default `127.0.0.1:8090` |
| `NOTIFIER_INTERVAL` | | Seconds between notification checks, default `300` |
| `LOG_LEVEL` | | Default `INFO` |
| `BACKEND_URL` | | For `web/`: backend origin used by the dev proxy |

## Development

```bash
cd backend && ruff check app tests && ruff format app tests && alembic check && pytest -q
cd web && npm run typecheck && npm run lint && npm run build
```

PostgreSQL integration tests run when `TEST_DATABASE_URL` is set; CI runs them against a Postgres service container.

## Acknowledgements

Built on the [AniList GraphQL API](https://docs.anilist.co) and its [documentation](https://github.com/AniList/docs). Not affiliated with AniList.
