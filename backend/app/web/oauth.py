import logging
import secrets
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiohttp import web
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.anilist.client import AniListError
from app.anilist.oauth import authorize_url, exchange_code
from app.bot import navigation as nav
from app.bot.context import Ctx
from app.bot.menu import main_menu
from app.bot.ui import b
from app.container import Container
from app.i18n import i18n
from app.services.auth import Viewer, fetch_viewer, link_account
from app.web.api import APP_KEY, client_ip
from app.web.ratelimit import TokenBucket

log = logging.getLogger(__name__)

BOT_KEY = web.AppKey("bot", Bot)
PENDING_TTL = 600
SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
}

templates = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html"]),
)
callback_limiter = TokenBucket(rate=0.2, burst=10)


@dataclass(slots=True)
class Pending:
    nonce: str
    csrf: str
    user_id: int
    chat_id: int | None
    message_id: int | None
    token: str
    expires_at: int
    viewer: Viewer
    created: float


_pending: dict[str, Pending] = {}


def _cleanup() -> None:
    now = time.monotonic()
    for key in [k for k, v in _pending.items() if now - v.created > PENDING_TTL]:
        _pending.pop(key, None)


def render(name: str, lang: str, status: int = 200, **context: Any) -> web.Response:
    _ = i18n.get(lang)
    html = templates.get_template(name).render(_=_, lang=lang, **context)
    return web.Response(text=html, status=status, content_type="text/html", headers=SECURITY_HEADERS)


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
        return render("auth_result.html", "en", 400, ok=False, bot=container.bot_username, reason="expired")
    url = authorize_url(container.settings.anilist_client_id, container.settings.callback_url, nonce)
    raise web.HTTPFound(url, headers={"Referrer-Policy": "no-referrer", "Cache-Control": "no-store"})


async def callback(request: web.Request) -> web.StreamResponse:
    container = request.app[APP_KEY]
    bot = request.app[BOT_KEY]
    if not callback_limiter.allow(client_ip(request)):
        return render("auth_result.html", "en", 429, ok=False, bot=container.bot_username, reason="rate")
    nonce = request.query.get("state", "")
    code = request.query.get("code", "")
    state = await container.oauth.peek(nonce) if nonce else None
    lang = await _lang_for(container, state["user_id"] if state else None)
    if state is None or not code:
        return render("auth_result.html", lang, 400, ok=False, bot=container.bot_username, reason="expired")
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
        return render("auth_result.html", lang, 400, ok=False, bot=container.bot_username, reason="exchange")
    _cleanup()
    pending = Pending(
        nonce=nonce,
        csrf=secrets.token_urlsafe(24),
        user_id=state["user_id"],
        chat_id=state.get("chat_id"),
        message_id=state.get("message_id"),
        token=token.access_token,
        expires_at=token.expires_at,
        viewer=viewer,
        created=time.monotonic(),
    )
    _pending[nonce] = pending
    telegram_name, telegram_username = str(pending.user_id), None
    try:
        chat = await bot.get_chat(pending.user_id)
        telegram_name = " ".join(p for p in (chat.first_name, chat.last_name) if p) or telegram_name
        telegram_username = chat.username
    except TelegramAPIError:
        pass
    return render(
        "auth_confirm.html",
        lang,
        viewer=viewer,
        telegram_name=telegram_name,
        telegram_username=telegram_username,
        nonce=nonce,
        csrf=pending.csrf,
    )


async def confirm(request: web.Request) -> web.StreamResponse:
    container = request.app[APP_KEY]
    bot = request.app[BOT_KEY]
    form = await request.post()
    nonce = str(form.get("nonce", ""))
    csrf = str(form.get("csrf", ""))
    action = str(form.get("action", ""))
    pending = _pending.get(nonce)
    lang = await _lang_for(container, pending.user_id if pending else None)
    if pending is None or not secrets.compare_digest(pending.csrf, csrf):
        return render("auth_result.html", lang, 400, ok=False, bot=container.bot_username, reason="expired")
    _pending.pop(nonce, None)
    state = await container.oauth.consume(nonce)
    if state is None:
        return render("auth_result.html", lang, 400, ok=False, bot=container.bot_username, reason="expired")
    if action != "confirm":
        return render("auth_result.html", lang, ok=False, bot=container.bot_username, reason="cancelled")
    try:
        viewer = await link_account(container, pending.user_id, pending.token, pending.expires_at)
    except AniListError:
        return render("auth_result.html", lang, 400, ok=False, bot=container.bot_username, reason="exchange")
    await notify_linked(container, bot, pending, viewer)
    return render("auth_result.html", lang, ok=True, bot=container.bot_username, viewer=viewer)


async def notify_linked(container: Container, bot: Bot, pending: Pending, viewer: Viewer) -> None:
    user = await container.users.get(pending.user_id)
    if user is None:
        return
    ctx = Ctx(bot=bot, app=container, user=user, _=i18n.get(user.lang))
    try:
        await bot.send_message(pending.user_id, ctx._("auth.success", name=b(viewer.name)), reply_markup=main_menu(ctx))
        if pending.chat_id and pending.message_id:
            await nav.open_at(ctx, nav.Target(pending.chat_id, pending.message_id), nav.HOME)
        else:
            await nav.send(ctx, pending.user_id, nav.HOME)
    except TelegramAPIError as exc:
        log.warning("Could not notify %s about login: %s", pending.user_id, exc)


def build_routes(app: web.Application) -> None:
    app.router.add_get("/auth/login", login)
    app.router.add_get("/auth/callback", callback)
    app.router.add_post("/auth/confirm", confirm)
