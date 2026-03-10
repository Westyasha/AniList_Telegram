<div align="center">

<img src="https://i.imgur.com/6dhiE9d.png" alt="AniList Bot Banner" width="100%">

# AniList Telegram Bot (unofficial)

**A Telegram bot for tracking anime & manga via your AniList account.**  
Profile cards · Episode notifications · Inline search · Full list management

[**Try the bot**](https://t.me/westyasha_AniList_bot)

</div>

---

## Screenshots

### Profile Card

<div align="center">
<img src="https://github.com/user-attachments/assets/1154d3ed-24bf-4eac-b169-088fe8daf96e" alt="Profile Card" width="100%">
</div>

---

### Feature Demos


| Profile Card — Generation | Profile Card — Result |
|:---:|:---:|
| <img src="https://i.imgur.com/dmAmXBB.gif" width="420"> | <img src="https://imgur.com/IcGSavr.png" width="420"> |

| Wrapped Stats | Anime Search |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/7a2405f8-81a2-4cd6-805d-df05633c8e1a" width="420"> | <img src="https://github.com/user-attachments/assets/c9913cb4-66fc-4fa5-af9c-35036e828625" width="420"> |



| Find Profile | Inline Mode |
| :--- | :--- |
| <img src="https://github.com/user-attachments/assets/40f67f04-57e5-43c6-bd96-6c0940f7a80c" width="450" /> | <img width="359" height="322" alt="image" src="https://github.com/user-attachments/assets/1d11e9ba-7c59-4b68-a3c4-6113795b439d" />


---

## Features

### Profile Card
Generates a glassmorphism-style profile card from your AniList data — avatar, stats, favourite anime and characters. The avatar ring adapts its color to your profile picture automatically. Cards are cached by data hash, so unchanged data returns instantly.

### Search
- Anime, manga, characters, staff search with paginated results
- Fuzzy search — finds titles even with typos
- Advanced filter — by genre, year, minimum score
- Full media detail view: synopsis, score, episodes, airing status, trailer link

### List Management
- View your Watching / Completed / Planning / Dropped / Paused / Rewatching lists
- Add, edit, remove titles directly from Telegram
- +1 / -1 episode progress buttons
- Rate titles (1–10), add personal notes
- Toggle Favourites for anime, manga, characters, staff

### Notifications
Per-user notification settings for:
- New episodes of titles in your Watching / Planning / Paused / Dropped lists
- Related titles (sequels, prequels, spin-offs) being added to AniList

### Browse
- Trending anime and manga (paginated)
- Current season picker with navigation between seasons and years
- Airing schedule — upcoming and recently aired episodes

### Wrapped
Annual stats card — episodes watched, top genres, most watched anime, monthly activity graph.

### Inline Mode
Use `@westyasha_AniList_bot` in any chat:
- Search and share anime cards inline
- Share your Now Watching list
- Share your Profile Card

### Settings
- Language switching (Russian / English)
- Custom keyboard layout
- Notification granularity settings
- Manual cache reset

---

## Project Structure

```
.
├── bot.py                  # Entry point, router registration
├── config.py               # Env vars
├── storage.py              # SQLite DB layer
├── notifier.py             # Background task — episode notifications
├── handlers/
│   ├── auth.py             # /start, authorization flow, onboarding
│   ├── search.py           # Search + advanced filter
│   ├── media.py            # Media detail view
│   ├── mylist.py           # List management
│   ├── browse.py           # Trending, season, schedule, profile
│   ├── profile_extra.py    # Profile card, Wrapped, inline card/watching
│   ├── findprofile.py      # /findprofile — look up any AniList user
│   ├── inline.py           # Inline query handler
│   └── help.py             # /help
├── core/
│   ├── api.py              # AniList GraphQL queries
│   ├── formatters.py       # Text formatters, MarkdownV2 escaping
│   ├── image_gen.py        # Playwright HTML→PNG renderer
│   ├── fuzzy.py            # Fuzzy title matching
│   └── filter.py           # Filter state helpers
├── templates/
│   ├── profile_card.html   # Glassmorphism profile card template (Jinja2)
│   └── wrapped.html        # Annual Wrapped card template
├── locales/
│   └── i18n.py             # All UI strings (RU / EN)
├── keyboards.py            # All inline & reply keyboards
└── requirements.txt
```

---

## Setup

### Prerequisites

- Python 3.11+
- A [Telegram Bot Token](https://t.me/BotFather)
- An [AniList OAuth app](https://anilist.co/settings/developer) (Client ID + Secret)
- Playwright Chromium (for card generation)

---

### Option A — Local / VPS

**1. Clone & install**

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt
playwright install chromium
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=your_telegram_bot_token
ANILIST_CLIENT_ID=your_anilist_client_id
ANILIST_CLIENT_SECRET=your_anilist_client_secret
ANILIST_REDIRECT_URI=https://anilist.co/api/v2/oauth/pin

# Optional
DB_PATH=users.db
```

**3. Run**

```bash
python bot.py
```

---

### Option B — Docker

```bash
cp .env.example .env
docker compose up -d
```

**`docker-compose.yml`**

```yaml
version: "3.9"

services:
  bot:
    build: .
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./data:/app/data
    environment:
      - DB_PATH=/app/data/users.db
```

**`Dockerfile`**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y wget gnupg curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
RUN playwright install-deps chromium

COPY . .

CMD ["python", "bot.py"]
```

Logs: `docker compose logs -f bot`  
Update: `git pull && docker compose up -d --build`

---

### Option C — systemd (VPS)

```ini
[Unit]
Description=AniList Telegram Bot
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/anilist-bot
EnvironmentFile=/home/YOUR_USER/anilist-bot/.env
ExecStart=/home/YOUR_USER/anilist-bot/venv/bin/python bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable anilist-bot
sudo systemctl start anilist-bot
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | yes | Telegram Bot API token from [@BotFather](https://t.me/BotFather) |
| `ANILIST_CLIENT_ID` | yes | AniList OAuth application Client ID |
| `ANILIST_CLIENT_SECRET` | yes | AniList OAuth application Client Secret |
| `ANILIST_REDIRECT_URI` | yes | Set to `https://anilist.co/api/v2/oauth/pin` for PIN flow |
| `DB_PATH` | no | Path to SQLite database file (default: `users.db`) |

### Getting AniList credentials

1. Go to [anilist.co/settings/developer](https://anilist.co/settings/developer)
2. Click **Create new client**
3. Set Redirect URL to `https://anilist.co/api/v2/oauth/pin`
4. Copy Client ID and Client Secret to your `.env`

---

### ⚠️ Known Limitations (as of 10/03/2025)

Heads up! The project is still a work in progress, so there are a few quirks. I might get around to fixing these someday, but for now, it is what it is xd

*   **Profile Card Generation:** Relies on Playwright (headless Chromium). The first generation takes ~3–5s to spin up, but subsequent ones are cached via Telegram `file_id` (so it gets faster).
*   **FSM:** Currently using `MemoryStorage` by default. If the bot restarts, all user states vanish into the void. 
*   **OAuth2:** Currently, it only works via hardcoded tokens. Definitely a "todo" for the future to make it normal..

*P.S. If you feel like tackling any of these, feel free to open a PR!!*

## 🛠 A quick note & acknowledgements for anilist dev

Honestly, I originally built this bot mostly as a personal **pet project** to scratch my own itch. Because of that, it's definitely still a bit rough around the edges, might contain some trash code and still has its fair share of bugs (many) 

But hey, if you find it useful, want to self-host it, or feel like yoinking some code for your own projects — absolutely go for it! Feel free to fork, tinker, or just use the bot as is.

Massive shoutout to the AniList team. Their GraphQL API is an absolute joy to work with, and their [API documentation repo](https://github.com/AniList/docs) basically carried this whole project. Without it, this bot simply wouldnt exist. 

---
