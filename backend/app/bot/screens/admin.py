import time
from typing import Any

from app.bot import navigation as nav
from app.bot.context import Ctx
from app.bot.navigation import Screen, routes
from app.bot.ui import Kb, app_btn, b, btn, code, h, i, webapp_url
from app.bot.views import duration
from app.services import stats


def _ms(ctx: Ctx, value: float) -> str:
    if value >= 1000:
        return ctx._("admin.seconds", n=f"{value / 1000:.1f}")
    return ctx._("admin.millis", n=f"{value:.0f}")


def _pct(value: float | None) -> str:
    return "—" if value is None else f"{value:.0f}%"


async def _home(ctx: Ctx) -> Screen:
    return await nav.build(ctx, nav.HOME)


@routes("/admin", group="admin")
async def admin_screen(ctx: Ctx) -> Screen:
    if not ctx.app.is_admin(ctx.user.user_id):
        return await _home(ctx)
    _ = ctx._
    data = await stats.overview(ctx.app)
    users: dict[str, Any] = data["users"]
    load: dict[str, Any] = data["load"]
    process: dict[str, Any] = data["process"]
    system: dict[str, Any] = data["system"]
    anilist: dict[str, Any] = data["anilist"]
    database: dict[str, Any] = data["database"]
    updates = load["updates"]["1h"]
    api = load["api"]["1h"]
    remote = load["anilist"]["1h"]
    renders = load["renders"]
    notifier = load["notifier"]
    notifier_text = (
        _(
            "admin.notifier_run",
            ago=_("admin.ago", time=duration(ctx, int(time.time()) - notifier["last_run"])),
            took=_ms(ctx, notifier["duration"] * 1000),
        )
        if notifier["last_run"]
        else _("admin.notifier_pending")
    )
    load_avg = " ".join(f"{value:.2f}" for value in system["load"]) if system["load"] else "—"
    lines = [
        _("admin.title", uptime=b(duration(ctx, process["uptime"]))),
        "",
        b(_("admin.users_head")),
        _("admin.users", total=b(users["total"]), linked=b(users["linked"]), blocked=users["blocked"]),
        _("admin.online", now=b(data["online"]), hour=users["seen_1h"], day=users["seen_24h"]),
        _("admin.active", dau=b(users["dau"]), wau=users["wau"], mau=users["mau"]),
        _("admin.joined", today=b(users["new_today"]), week=users["new_7d"]),
        _("admin.events", bot=users["events_today"]["bot"], app=users["events_today"]["app"]),
        "",
        b(_("admin.load_head")),
        _("admin.updates", rate=b(updates["rate"]), p50=_ms(ctx, updates["p50"]), p95=_ms(ctx, updates["p95"])),
        _("admin.api", rate=b(api["rate"]), p95=_ms(ctx, api["p95"])),
        _(
            "admin.anilist",
            rate=b(remote["rate"]),
            p95=_ms(ctx, remote["p95"]),
            used=anilist["window_used"],
            limit=anilist["window_limit"],
            hit=_pct(load["cache_hit"]["1h"]),
        ),
        _("admin.limited", n=load["anilist_limited_24h"]),
        _("admin.renders", n=b(renders["count"]), avg=_ms(ctx, renders["avg"]), p95=_ms(ctx, renders["p95"])),
        _("admin.alerts", n=b(load["notifications"]["24h"]), notifier=notifier_text),
        "",
        b(_("admin.server_head")),
        _(
            "admin.process",
            cpu=b(f"{process['cpu']:.0f}%"),
            rss=b(f"{process['rss_mb']:.0f} MB"),
            lag=_ms(ctx, process["loop_lag_ms"]),
            tasks=process["tasks"],
        ),
        _(
            "admin.system",
            cpu=f"{system['cpu']:.0f}%",
            used=f"{system['memory_used_mb'] / 1024:.1f}",
            total=f"{system['memory_total_mb'] / 1024:.1f}",
            load=load_avg,
        ),
        _("admin.disk", used=system["disk_used_gb"], total=system["disk_total_gb"]),
        _("admin.database", size=database["size_mb"], conn=database["connections"]),
        "",
        _("admin.errors", hour=b(load["errors"]["1h"]), day=load["errors"]["24h"], warn=load["warnings"]["24h"]),
    ]
    kb = Kb()
    kb.row(btn(_("admin.refresh"), "/admin"), btn(_("admin.errors_button"), "/admin/err"))
    url = webapp_url(ctx, "/admin")
    if url:
        kb.row(app_btn(_("admin.dashboard"), url, "primary"))
    return Screen("\n".join(lines), kb.nav(ctx).build())


@routes("/admin/err", group="admin_err")
async def admin_errors_screen(ctx: Ctx) -> Screen:
    if not ctx.app.is_admin(ctx.user.user_id):
        return await _home(ctx)
    _ = ctx._
    records = stats.errors()[:8]
    lines = [b(_("admin.errors_title")), ""]
    if not records:
        lines.append(i(_("admin.no_errors")))
    now = int(time.time())
    for record in records:
        lines.append(
            f"{code(record['kind'])} · {h(record['source'])} · {_('admin.ago', time=duration(ctx, now - record['at']))}"
        )
        lines.append(i(record["message"][:300]))
        lines.append("")
    kb = Kb().row(btn(_("admin.refresh"), "/admin/err"))
    return Screen("\n".join(lines).strip(), kb.nav(ctx).build())
