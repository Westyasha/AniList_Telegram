import ipaddress
import json
import logging
from typing import Any

from aiohttp import web

from app.anilist.client import AniListError, RateLimitedError
from app.container import Container
from app.db.models import APPEARANCE_DEFAULTS, NOTIFICATION_DEFAULTS, User
from app.i18n import LANGUAGES
from app.security import InitDataError, WebAppIdentity, new_nonce, validate_init_data
from app.web.operations import OPERATIONS
from app.web.ratelimit import TokenBucket

log = logging.getLogger(__name__)

APP_KEY = web.AppKey("container", Container)
MAX_VARIABLES_BYTES = 4096
STATE_TTL = 900

user_limiter = TokenBucket(rate=1.0, burst=40)
anon_limiter = TokenBucket(rate=0.5, burst=20)


def error(status: int, code: str, message: str | None = None) -> web.Response:
    body: dict[str, Any] = {"error": code}
    if message:
        body["message"] = message
    return web.json_response(body, status=status)


def is_trusted_proxy(peer: str) -> bool:
    try:
        address = ipaddress.ip_address(peer)
    except ValueError:
        return False
    return address.is_loopback or address.is_private


def client_ip(request: web.Request) -> str:
    peer = request.remote or ""
    if is_trusted_proxy(peer):
        return (
            request.headers.get("X-Real-IP") or request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or peer
        )
    return peer


def identity(request: web.Request) -> WebAppIdentity | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("tma "):
        return None
    container = request.app[APP_KEY]
    try:
        return validate_init_data(header[4:], container.settings.bot_token.get_secret_value())
    except InitDataError:
        raise web.HTTPUnauthorized(
            text=json.dumps({"error": "bad_init_data"}), content_type="application/json"
        ) from None


async def current_user(request: web.Request) -> tuple[WebAppIdentity | None, User | None]:
    who = identity(request)
    if who is None:
        return None, None
    container = request.app[APP_KEY]
    container.activity.touch(who.user_id, "app")
    user = await container.users.get_or_create(who.user_id, who.language_code)
    return who, user


async def session_payload(
    container: Container, who: WebAppIdentity | None, user: User | None, fallback_lang: str = "en"
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "user": None,
        "lang": user.lang if user else fallback_lang,
        "bot_username": container.bot_username,
        "anilist": None,
        "notifications": dict(user.notifications) if user else dict(NOTIFICATION_DEFAULTS),
        "appearance": dict(user.appearance) if user else dict(APPEARANCE_DEFAULTS),
        "is_admin": bool(who and container.is_admin(who.user_id)),
    }
    if who:
        payload["user"] = {
            "id": who.user_id,
            "first_name": who.first_name,
            "last_name": who.last_name,
            "username": who.username,
            "photo_url": who.photo_url,
        }
    if user and user.authorized and user.token:
        try:
            data = await container.anilist.query(
                """query { Viewer { id name bannerImage unreadNotificationCount avatar { large }
                options { titleLanguage profileColor } mediaListOptions { scoreFormat } } }""",
                token=user.token,
                ttl=20,
            )
            viewer = data.get("Viewer") or {}
        except AniListError as exc:
            if exc.unauthorized:
                await container.users.clear_auth(user.user_id)
                return payload
            viewer = {}
        payload["anilist"] = {
            "id": user.anilist_id,
            "name": viewer.get("name") or user.anilist_name,
            "avatar": (viewer.get("avatar") or {}).get("large"),
            "banner": viewer.get("bannerImage"),
            "score_format": ((viewer.get("mediaListOptions") or {}).get("scoreFormat")) or user.score_format,
            "title_language": ((viewer.get("options") or {}).get("titleLanguage")) or user.title_language,
            "profile_color": (viewer.get("options") or {}).get("profileColor"),
            "unread_notifications": viewer.get("unreadNotificationCount") or 0,
        }
    return payload


async def get_session(request: web.Request) -> web.Response:
    container = request.app[APP_KEY]
    who, user = await current_user(request)
    accepted = request.headers.get("Accept-Language", "").lower()
    fallback = "ru" if accepted.startswith(("ru", "uk", "be", "kk")) else "en"
    return web.json_response(await session_payload(container, who, user, fallback))


async def post_settings(request: web.Request) -> web.Response:
    container = request.app[APP_KEY]
    who, user = await current_user(request)
    if who is None or user is None:
        return error(401, "auth_required")
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error(400, "bad_request")
    if not isinstance(body, dict):
        return error(400, "bad_request")
    lang = body.get("lang")
    if lang in LANGUAGES:
        await container.users.set_lang(user.user_id, lang)
        user.lang = lang
    appearance = body.get("appearance")
    if isinstance(appearance, dict):
        user.appearance = await container.users.set_appearance(user.user_id, {**user.appearance, **appearance})
    notifications = body.get("notifications")
    if isinstance(notifications, dict):
        merged = {**user.notifications, **{k: bool(v) for k, v in notifications.items() if k in NOTIFICATION_DEFAULTS}}
        await container.users.set_notifications(user.user_id, merged)
        user.notifications = merged
    return web.json_response(await session_payload(container, who, user))


async def post_auth_link(request: web.Request) -> web.Response:
    container = request.app[APP_KEY]
    who, user = await current_user(request)
    if who is None or user is None:
        return error(401, "auth_required")
    settings = container.settings
    if settings.pin_flow or not settings.public_url:
        return web.json_response({"url": f"https://t.me/{container.bot_username}?start=login", "mode": "bot"})
    if not user_limiter.allow(f"link:{who.user_id}", cost=5):
        return error(429, "rate_limited")
    nonce = new_nonce()
    await container.oauth.create(nonce, who.user_id, None, None, STATE_TTL)
    return web.json_response({"url": f"{settings.public_url.rstrip('/')}/auth/login?state={nonce}", "mode": "oauth"})


async def post_logout(request: web.Request) -> web.Response:
    container = request.app[APP_KEY]
    who, user = await current_user(request)
    if who is None or user is None:
        return error(401, "auth_required")
    await container.users.clear_auth(user.user_id)
    user.token = None
    user.anilist_id = None
    return web.json_response(await session_payload(container, who, user))


async def post_gql(request: web.Request) -> web.Response:
    container = request.app[APP_KEY]
    if request.content_length and request.content_length > MAX_VARIABLES_BYTES + 512:
        return error(413, "too_large")
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error(400, "bad_request")
    if not isinstance(body, dict):
        return error(400, "bad_request")
    operation = OPERATIONS.get(str(body.get("op")))
    if operation is None:
        return error(400, "unknown_operation")
    variables = body.get("variables") or {}
    if not isinstance(variables, dict) or len(json.dumps(variables)) > MAX_VARIABLES_BYTES:
        return error(400, "bad_variables")
    who, user = await current_user(request)
    key = f"u:{who.user_id}" if who else f"ip:{client_ip(request)}"
    limiter = user_limiter if who else anon_limiter
    if not limiter.allow(key, cost=3 if operation.mutation else 1):
        return error(429, "rate_limited")
    token = user.token if user and user.authorized else None
    if operation.auth and not token:
        return error(401, "auth_required")
    use_token = token if (operation.auth or operation.personal) else None
    ttl = 0 if operation.mutation or (operation.personal and use_token) else operation.ttl
    try:
        data = await container.anilist.query(operation.document, variables, token=use_token, ttl=ttl)
    except RateLimitedError:
        return error(429, "rate_limited")
    except AniListError as exc:
        if use_token and exc.unauthorized and user:
            await container.users.clear_auth(user.user_id)
            return error(401, "auth_required")
        status = 404 if exc.not_found else 502
        return error(status, "anilist_error", exc.message)
    if operation.mutation:
        container.anilist.invalidate()
    return web.json_response({"data": data})


def build_routes(app: web.Application) -> None:
    app.router.add_get("/api/session", get_session)
    app.router.add_post("/api/settings", post_settings)
    app.router.add_post("/api/auth/link", post_auth_link)
    app.router.add_post("/api/auth/logout", post_logout)
    app.router.add_post("/api/gql", post_gql)
