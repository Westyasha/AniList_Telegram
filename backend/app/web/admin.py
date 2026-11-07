from aiohttp import web

from app.db.admin import USER_SORTS
from app.services import stats
from app.web.api import APP_KEY, error, identity, user_limiter

PAGE_SIZE = 30


def require_admin(request: web.Request) -> int:
    who = identity(request)
    container = request.app[APP_KEY]
    if who is None or not container.is_admin(who.user_id):
        raise web.HTTPForbidden(text='{"error":"forbidden"}', content_type="application/json")
    if not user_limiter.allow(f"admin:{who.user_id}", cost=1):
        raise web.HTTPTooManyRequests(text='{"error":"rate_limited"}', content_type="application/json")
    container.activity.touch(who.user_id, "app")
    return who.user_id


async def get_overview(request: web.Request) -> web.Response:
    require_admin(request)
    return web.json_response(await stats.overview(request.app[APP_KEY]))


async def get_series(request: web.Request) -> web.Response:
    require_admin(request)
    return web.json_response(stats.series(request.query.get("range", "1h")))


async def get_daily(request: web.Request) -> web.Response:
    require_admin(request)
    try:
        days = min(90, max(7, int(request.query.get("days", "30"))))
    except ValueError:
        return error(400, "bad_request")
    return web.json_response({"days": await request.app[APP_KEY].admin.daily(days)})


async def get_users(request: web.Request) -> web.Response:
    require_admin(request)
    container = request.app[APP_KEY]
    sort = request.query.get("sort", "seen")
    if sort not in USER_SORTS:
        sort = "seen"
    try:
        offset = max(0, min(100_000, int(request.query.get("offset", "0"))))
    except ValueError:
        return error(400, "bad_request")
    result = await container.admin.users(
        request.query.get("q", ""), sort, offset, PAGE_SIZE, container.activity.online_ids()
    )
    return web.json_response({**result, "offset": offset, "limit": PAGE_SIZE})


async def get_user(request: web.Request) -> web.Response:
    require_admin(request)
    try:
        user_id = int(request.match_info["user_id"])
    except ValueError:
        return error(400, "bad_request")
    return web.json_response({"days": await request.app[APP_KEY].admin.user_days(user_id)})


async def get_errors(request: web.Request) -> web.Response:
    require_admin(request)
    return web.json_response({"errors": stats.errors()})


def build_routes(app: web.Application) -> None:
    app.router.add_get("/api/admin/overview", get_overview)
    app.router.add_get("/api/admin/series", get_series)
    app.router.add_get("/api/admin/daily", get_daily)
    app.router.add_get("/api/admin/users", get_users)
    app.router.add_get(r"/api/admin/users/{user_id:\d+}", get_user)
    app.router.add_get("/api/admin/errors", get_errors)
