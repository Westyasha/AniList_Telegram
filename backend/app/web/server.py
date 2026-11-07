import logging
from collections.abc import Awaitable, Callable

from aiogram import Bot
from aiohttp import web

from app.container import Container
from app.web import api, oauth

log = logging.getLogger(__name__)


async def health(request: web.Request) -> web.Response:
    return web.json_response({"ok": True})


Handler = Callable[[web.Request], Awaitable[web.StreamResponse]]


@web.middleware
async def cache_headers(request: web.Request, handler: Handler) -> web.StreamResponse:
    response = await handler(request)
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
    oauth.build_routes(app)
    return app


async def start_server(container: Container, bot: Bot) -> web.AppRunner:
    runner = web.AppRunner(create_app(container, bot), access_log=None)
    await runner.setup()
    site = web.TCPSite(runner, container.settings.web_host, container.settings.web_port)
    await site.start()
    log.info("Web server listening on %s:%s", container.settings.web_host, container.settings.web_port)
    return runner
