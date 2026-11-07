import json
import logging
import secrets
from dataclasses import asdict
from urllib.parse import urlencode

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiohttp import web

from app.anilist.client import AniListError
from app.anilist.oauth import authorize_url, exchange_code
from app.bot import navigation as nav
from app.bot.context import Ctx
from app.bot.menu import main_menu
from app.bot.ui import b
from app.container import Container
from app.i18n import i18n
from app.services.auth import Viewer, fetch_viewer, link_account
from app.web.api import APP_KEY, client_ip, error
from app.web.ratelimit import TokenBucket

log = logging.getLogger(__name__)

BOT_KEY = web.AppKey("bot", Bot)
PENDING_TTL = 600
NO_STORE = {"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}

callback_limiter = TokenBucket(rate=0.2, burst=10)
confirm_limiter = TokenBucket(rate=0.5, burst=10)


def _redirect(container: Container, path: str, **params: str) -> web.HTTPFound:
    base = container.settings.public_url.rstrip("/")
    query = f"?{urlencode(params)}" if params else ""
    return web.HTTPFound(f"{base}{path}{query}", headers=NO_STORE)


async def _lang_for(container: Container, user_id: int | None) -> str:
    if user_id is None:
        return "en"
    user = await container.users.get(user_id)
    return user.lang if user else "en"


async def login(request: web.Request) -> web.StreamResponse:
    container = request.app[APP_KEY]
    nonce = request.query.get("state", "")
    state = await container.oauth.peek(nonce) if nonce else None
    if state is None:
        raise _redirect(container, "/auth/result", status="expired")
    raise web.HTTPFound(
        authorize_url(container.settings.anilist_client_id, container.settings.callback_url, nonce), headers=NO_STORE
    )


async def callback(request: web.Request) -> web.StreamResponse:
    container = request.app[APP_KEY]
    if not callback_limiter.allow(client_ip(request)):
        raise _redirect(container, "/auth/result", status="rate")
    nonce = request.query.get("state", "")
    code = request.query.get("code", "")
    state = await container.oauth.peek(nonce) if nonce else None
    if state is None or not code:
        raise _redirect(container, "/auth/result", status="expired")
    lang = await _lang_for(container, state["user_id"])
    settings = container.settings
    try:
        token = await exchange_code(
            container.anilist.session,
            client_id=settings.anilist_client_id,
            client_secret=settings.anilist_client_secret.get_secret_value(),
            redirect_uri=settings.callback_url,
            code=code,
        )
        viewer = await fetch_viewer(container, token.access_token)
    except AniListError as exc:
        log.warning("OAuth exchange failed: %s", exc.message)
        raise _redirect(container, "/auth/result", status="exchange", lang=lang) from None
    csrf = secrets.token_urlsafe(24)
    await container.pending.save(
        nonce=nonce,
        csrf=csrf,
        state=state,
        token=token.access_token,
        token_expires_at=token.expires_at,
        viewer=asdict(viewer),
        ttl=PENDING_TTL,
    )
    base = container.settings.public_url.rstrip("/")
    raise web.HTTPFound(f"{base}/auth/confirm#{urlencode({'nonce': nonce, 'csrf': csrf})}", headers=NO_STORE)


async def pending(request: web.Request) -> web.Response:
    container = request.app[APP_KEY]
    bot = request.app[BOT_KEY]
    item = await container.pending.get(request.query.get("nonce", ""))
    if item is None:
        return error(404, "expired")
    viewer = item["viewer"]
    telegram_name, telegram_username = str(item["user_id"]), None
    try:
        chat = await bot.get_chat(item["user_id"])
        telegram_name = " ".join(p for p in (chat.first_name, chat.last_name) if p) or telegram_name
        telegram_username = chat.username
    except TelegramAPIError:
        pass
    return web.json_response(
        {
            "anilist": {"name": viewer["name"], "avatar": viewer.get("avatar")},
            "telegram": {"name": telegram_name, "username": telegram_username},
            "lang": await _lang_for(container, item["user_id"]),
            "expires_in": PENDING_TTL,
        },
        headers=NO_STORE,
    )


async def confirm(request: web.Request) -> web.Response:
    container = request.app[APP_KEY]
    bot = request.app[BOT_KEY]
    if not confirm_limiter.allow(client_ip(request)):
        return error(429, "rate")
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error(400, "bad_request")
    if not isinstance(body, dict):
        return error(400, "bad_request")
    nonce, csrf = str(body.get("nonce", "")), str(body.get("csrf", ""))
    item = await container.pending.get(nonce)
    if item is None or not secrets.compare_digest(item["csrf"], csrf):
        return error(400, "expired")
    await container.pending.delete(nonce)
    state = await container.oauth.consume(nonce)
    if state is None:
        return error(400, "expired")
    if body.get("action") != "confirm":
        return web.json_response({"status": "cancelled"}, headers=NO_STORE)
    try:
        viewer = await link_account(container, item["user_id"], item["token"], item["token_expires_at"])
    except AniListError:
        return error(400, "exchange")
    await notify_linked(container, bot, item, viewer)
    return web.json_response({"status": "ok", "anilist": {"name": viewer.name}}, headers=NO_STORE)


async def notify_linked(container: Container, bot: Bot, item: dict, viewer: Viewer) -> None:
    user = await container.users.get(item["user_id"])
    if user is None:
        return
    ctx = Ctx(bot=bot, app=container, user=user, _=i18n.get(user.lang))
    try:
        await bot.send_message(user.user_id, ctx._("auth.success", name=b(viewer.name)), reply_markup=main_menu(ctx))
        if item.get("chat_id") and item.get("message_id"):
            await nav.open_at(ctx, nav.Target(item["chat_id"], item["message_id"]), nav.HOME)
        else:
            await nav.send(ctx, user.user_id, nav.HOME)
    except TelegramAPIError as exc:
        log.warning("Could not notify %s about login: %s", user.user_id, exc)


def build_routes(app: web.Application) -> None:
    app.router.add_get("/auth/login", login)
    app.router.add_get("/auth/callback", callback)
    app.router.add_get("/api/auth/pending", pending)
    app.router.add_post("/api/auth/confirm", confirm)
