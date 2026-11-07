import os
import time
from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest
from aiohttp.test_utils import TestClient, TestServer

from app.config import Settings
from app.container import Container
from app.db.schema import Base
from app.services.auth import Viewer
from app.web import oauth
from app.web.server import create_app

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL is not set")


class FakeBot:
    async def get_chat(self, chat_id: int) -> Any:
        return SimpleNamespace(first_name="Ann", last_name=None, username="ann")


@pytest.fixture
async def client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[tuple[TestClient, Container]]:
    assert TEST_URL
    monkeypatch.setenv("DATABASE_URL", TEST_URL)
    monkeypatch.setenv("PUBLIC_URL", "https://anilist.test")
    container = Container.build(Settings())
    await container.db.connect()
    async with container.db.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    linked: list[int] = []

    async def fake_link(app: Container, user_id: int, token: str, expires_at: int = 0) -> Viewer:
        linked.append(user_id)
        return Viewer(id=9, name="Ann", score_format="POINT_10", title_language="ENGLISH", avatar=None)

    async def fake_notify(*args: Any) -> None:
        return None

    monkeypatch.setattr(oauth, "link_account", fake_link)
    monkeypatch.setattr(oauth, "notify_linked", fake_notify)
    async with TestClient(TestServer(create_app(container, FakeBot()))) as test_client:
        test_client.linked = linked
        yield test_client, container
    await container.db.close()


async def seed(container: Container, nonce: str) -> None:
    await container.oauth.create(nonce, 42, None, None, ttl=60)
    await container.pending.save(
        nonce=nonce,
        csrf="right",
        state={"user_id": 42, "chat_id": None, "message_id": None},
        token="token",
        token_expires_at=int(time.time()) + 100,
        viewer={"id": 9, "name": "Ann", "avatar": None},
        ttl=60,
    )


async def test_pending_shows_both_accounts(client: tuple[TestClient, Container]) -> None:
    http, container = client
    await seed(container, "n1")
    resp = await http.get("/api/auth/pending", params={"nonce": "n1"})
    body = await resp.json()
    assert resp.status == 200
    assert body["anilist"]["name"] == "Ann"
    assert body["telegram"]["username"] == "ann"
    assert (await http.get("/api/auth/pending", params={"nonce": "nope"})).status == 404


async def test_confirm_rejects_wrong_csrf_and_reuse(client: tuple[TestClient, Container]) -> None:
    http, container = client
    await seed(container, "n2")
    bad = await http.post("/api/auth/confirm", json={"nonce": "n2", "csrf": "wrong", "action": "confirm"})
    assert bad.status == 400
    ok = await http.post("/api/auth/confirm", json={"nonce": "n2", "csrf": "right", "action": "confirm"})
    assert ok.status == 200
    assert (await ok.json())["status"] == "ok"
    assert http.linked == [42]
    again = await http.post("/api/auth/confirm", json={"nonce": "n2", "csrf": "right", "action": "confirm"})
    assert again.status == 400


async def test_cancel_does_not_link(client: tuple[TestClient, Container]) -> None:
    http, container = client
    await seed(container, "n3")
    resp = await http.post("/api/auth/confirm", json={"nonce": "n3", "csrf": "right", "action": "cancel"})
    assert (await resp.json())["status"] == "cancelled"
    assert http.linked == []


async def test_login_with_unknown_state_redirects_to_result(client: tuple[TestClient, Container]) -> None:
    http, _ = client
    resp = await http.get("/auth/login", params={"state": "unknown"}, allow_redirects=False)
    assert resp.status == 302
    assert resp.headers["Location"] == "https://anilist.test/auth/result?status=expired"
