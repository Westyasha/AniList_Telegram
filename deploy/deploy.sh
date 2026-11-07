#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/anilist-telegram
BRANCH=${1:-main}

cd "$APP_DIR"
git fetch --quiet origin "$BRANCH"
git reset --quiet --hard "origin/$BRANCH"

python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt
PLAYWRIGHT_BROWSERS_PATH="$APP_DIR/.browsers" .venv/bin/playwright install chromium >/dev/null

(cd webapp && npm ci --silent && npm run build --silent)

mkdir -p data
chown -R anilist:anilist data .browsers
systemctl restart anilist-bot
systemctl --no-pager --lines=5 status anilist-bot
