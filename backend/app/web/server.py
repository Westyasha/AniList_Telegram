import logging
import time
from collections.abc import Awaitable, Callable

from aiogram import Bot
from aiohttp import web

from app.container import Container
from app.services.metrics import metrics
from app.web import admin, api, oauth

log = logging.getLogger(__name__)


async def health(request: web.Request) -> web.Response:
    return web.json_response({"ok": True})


Handler = Callable[[web.Request], Awaitable[web.StreamResponse]]


@web.middleware
async def cache_headers(request: web.Request, handler: Handler) -> web.StreamResponse:
    if not request.path.startswith("/api/"):
        response = await handler(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        return response
    started = time.perf_counter()
    failed = True
    try:
        response = await handler(request)
        failed = response.status >= 500
    except web.HTTPException as exc:
        failed = exc.status >= 500
        raise
    finally:
        metrics.api.record((time.perf_counter() - started) * 1000, error=failed)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


def create_app(container: Container, bot: Bot) -> web.Application:
    app = web.Application(middlewares=[cache_headers], client_max_size=64 * 1024)
    app[api.APP_KEY] = container
    app[oauth.BOT_KEY] = bot
    app.router.add_get("/healthz", health)
    api.build_routes(app)
    admin.build_routes(app)
    oauth.build_routes(app)
    return app


async def start_server(container: Container, bot: Bot) -> web.AppRunner:
    runner = web.AppRunner(create_app(container, bot), access_log=None)
    await runner.setup()
    site = web.TCPSite(runner, container.settings.web_host, container.settings.web_port)
    await site.start()
    log.info("Web server listening on %s:%s", container.settings.web_host, container.settings.web_port)
    return runner
