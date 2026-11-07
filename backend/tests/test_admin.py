import hashlib
import hmac
import json
import os
import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlencode

import pytest
from aiohttp.test_utils import TestClient, TestServer

from app.config import Settings
from app.container import Container
from app.db.repositories import ActivityRepository
from app.db.schema import Base
from app.web.server import create_app

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL is not set")

BOT_TOKEN = "123456:ADMIN-TEST"
ADMIN = 701516808
STRANGER = 42


def init_data(user_id: int) -> str:
    fields = {"auth_date": str(int(time.time())), "user": json.dumps({"id": user_id, "first_name": "T"})}
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    digest = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode({**fields, "hash": digest})


def auth(user_id: int) -> dict[str, str]:
    return {"Authorization": f"tma {init_data(user_id)}"}


@pytest.fixture
async def client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[tuple[TestClient, Container]]:
    assert TEST_URL
    monkeypatch.setenv("DATABASE_URL", TEST_URL)
    monkeypatch.setenv("BOT_TOKEN", BOT_TOKEN)
    monkeypatch.setenv("ADMIN_IDS", str(ADMIN))
    container = Container.build(Settings())
    await container.db.connect()
    async with container.db.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    bot: Any = SimpleNamespace()
    async with TestClient(TestServer(create_app(container, bot))) as test_client:
        yield test_client, container
    await container.db.close()


@pytest.mark.parametrize("path", ["overview", "series", "daily", "users", "users/1", "errors"])
async def test_admin_endpoints_reject_strangers(client: tuple[TestClient, Container], path: str) -> None:
    http, _ = client
    assert (await http.get(f"/api/admin/{path}")).status == 403
    assert (await http.get(f"/api/admin/{path}", headers=auth(STRANGER))).status == 403
    assert (await http.get(f"/api/admin/{path}", headers={"Authorization": "tma user=1&hash=bad"})).status == 401


async def test_admin_overview_and_users(client: tuple[TestClient, Container]) -> None:
    http, container = client
    for user_id in (ADMIN, STRANGER, 7):
        await container.users.get_or_create(user_id, "en")
    container.activity.touch(STRANGER, "bot")
    container.activity.touch(STRANGER, "app")
    container.activity.touch(7, "bot")
    await container.activity.flush()

    response = await http.get("/api/admin/overview", headers=auth(ADMIN))
    assert response.status == 200
    body = await response.json()
    assert body["users"]["total"] == 3
    assert body["users"]["dau"] >= 2
    assert body["online"] >= 2
    assert {"process", "system", "database", "load", "anilist"} <= body.keys()

    response = await http.get("/api/admin/users?sort=active", headers=auth(ADMIN))
    users = await response.json()
    assert users["total"] == 3
    assert users["items"][0]["id"] == STRANGER
    assert users["items"][0]["events_7d"] == 2
    assert users["items"][0]["online"] is True

    response = await http.get("/api/admin/users?q=4", headers=auth(ADMIN))
    assert [item["id"] for item in (await response.json())["items"]] == [STRANGER]

    response = await http.get("/api/admin/users?q=%25", headers=auth(ADMIN))
    assert (await response.json())["total"] == 0

    session = await (await http.get("/api/session", headers=auth(ADMIN))).json()
    assert session["is_admin"] is True
    session = await (await http.get("/api/session", headers=auth(STRANGER))).json()
    assert session["is_admin"] is False


async def test_activity_accumulates_per_day(client: tuple[TestClient, Container]) -> None:
    _, container = client
    repository = ActivityRepository(container.db)
    today = datetime.now(UTC).date()
    now = datetime.now(UTC)
    await container.users.get_or_create(5, "en")
    await repository.record(today, {5: (2, 1)}, now)
    await repository.record(today, {5: (1, 0)}, now)
    await repository.record(today - timedelta(days=1), {5: (4, 0)}, now)
    days = await container.admin.user_days(5, days=7)
    assert days[-1] == {"day": today.isoformat(), "bot": 3, "app": 1}
    assert days[-2]["bot"] == 4
    daily = await container.admin.daily(7)
    assert len(daily) == 7
    assert daily[-1]["active"] == 1
    assert daily[-1]["joined"] == 1
