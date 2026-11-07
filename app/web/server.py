import logging
from collections.abc import Awaitable, Callable
from pathlib import Path

from aiogram import Bot
from aiohttp import web

from app.container import Container
from app.web import api, oauth

log = logging.getLogger(__name__)


async def health(request: web.Request) -> web.Response:
    return web.json_response({"ok": True})


@web.middleware
async def api_headers(
    request: web.Request, handler: Callable[[web.Request], Awaitable[web.StreamResponse]]
) -> web.StreamResponse:
    response = await handler(request)
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def mount_webapp(app: web.Application, dist: Path) -> None:
    index = dist / "index.html"
    if not index.is_file():
        log.info("Mini App build not found at %s, static serving disabled", dist)
        return

    async def spa(request: web.Request) -> web.FileResponse:
        return web.FileResponse(index, headers={"Cache-Control": "no-cache"})

    assets = dist / "assets"
    if assets.is_dir():
        app.router.add_static("/assets", assets, append_version=False)
    app.router.add_get("/", spa)


def create_app(container: Container, bot: Bot) -> web.Application:
    app = web.Application(middlewares=[api_headers], client_max_size=64 * 1024)
    app[api.APP_KEY] = container
    app[oauth.BOT_KEY] = bot
    app.router.add_get("/healthz", health)
    api.build_routes(app)
    oauth.build_routes(app)
    mount_webapp(app, container.settings.webapp_dist)
    return app


async def start_server(container: Container, bot: Bot) -> web.AppRunner:
    runner = web.AppRunner(create_app(container, bot), access_log=None)
    await runner.setup()
    site = web.TCPSite(runner, container.settings.web_host, container.settings.web_port)
    await site.start()
    log.info("Web server listening on %s:%s", container.settings.web_host, container.settings.web_port)
    return runner
