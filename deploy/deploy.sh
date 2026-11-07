#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/anilist-telegram
BRANCH=${1:-main}

cd "$APP_DIR"
git fetch --quiet origin "$BRANCH"
git reset --quiet --hard "origin/$BRANCH"

python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r backend/requirements.txt
PLAYWRIGHT_BROWSERS_PATH="$APP_DIR/.browsers" .venv/bin/playwright install chromium >/dev/null

(cd web && npm ci --silent && npm run build --silent)
cp -r web/public web/.next/standalone/public 2>/dev/null || true
cp -r web/.next/static web/.next/standalone/.next/static
mkdir -p web/.next/standalone/.next/cache data

chown -R anilist:anilist data .browsers web/.next/standalone/.next/cache
systemctl restart anilist-bot anilist-web
systemctl --no-pager --lines=3 status anilist-bot anilist-web
