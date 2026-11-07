import json
import os
import sqlite3
import time
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from aiogram.fsm.storage.base import StorageKey
from sqlalchemy import select

from app.cli import import_sqlite
from app.db.database import Database
from app.db.fsm import PostgresStorage
from app.db.repositories import (
    NavigationRepository,
    NotificationLog,
    OAuthPendingRepository,
    OAuthStateRepository,
    TextRepository,
    UserRepository,
    normalize_appearance,
    normalize_layout,
)
from app.db.schema import Base, UserRow
from app.security import TokenCipher

TEST_URL = os.environ.get("TEST_DATABASE_URL")
needs_db = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL is not set")


@pytest.fixture
async def db() -> AsyncIterator[Database]:
    assert TEST_URL
    database = Database(TEST_URL)
    await database.connect()
    async with database.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield database
    await database.close()


@needs_db
async def test_user_roundtrip_encrypts_token(db: Database) -> None:
    cipher = TokenCipher("k")
    users = UserRepository(db, cipher)
    created = await users.get_or_create(1, "en-US")
    assert created.is_new
    assert created.lang == "en"
    await users.set_auth(
        1,
        token="tok",
        expires_at=int(time.time()) + 3600,
        anilist_id=77,
        anilist_name="Ann",
        score_format="POINT_100",
        title_language="ROMAJI",
    )
    user = await users.get(1)
    assert user is not None
    assert user.token == "tok"
    assert user.authorized
    assert user.title_pref == "romaji"
    async with db.connection() as conn:
        stored = (await conn.execute(select(UserRow.token_enc).where(UserRow.user_id == 1))).scalar()
    assert stored != "tok"
    assert [u.user_id for u in await users.notifiable()] == [1]
    await users.clear_auth(1)
    cleared = await users.get(1)
    assert cleared is not None
    assert not cleared.authorized
    assert await users.stats() == (1, 0)


@needs_db
async def test_notification_log_dedupes(db: Database) -> None:
    log = NotificationLog(db)
    assert await log.mark(1, "airing", 10, 3) is True
    assert await log.mark(1, "airing", 10, 3) is False
    assert await log.mark(1, "airing", 10, 4) is True


@needs_db
async def test_navigation_and_texts(db: Database) -> None:
    nav = NavigationRepository(db, depth=3)
    await nav.set("1:2", ["/home", "/a", "/b", "/c"])
    assert await nav.get("1:2") == ["/a", "/b", "/c"]
    assert await nav.get("missing") == []
    texts = TextRepository(db)
    digest = await texts.put("frieren")
    assert await texts.put("frieren") == digest
    assert await texts.get(digest) == "frieren"


@needs_db
async def test_oauth_state_is_single_use(db: Database) -> None:
    states = OAuthStateRepository(db)
    await states.create("n1", 5, 6, 7, ttl=60)
    assert (await states.peek("n1") or {})["user_id"] == 5
    consumed = await states.consume("n1")
    assert consumed is not None
    assert consumed["message_id"] == 7
    assert await states.consume("n1") is None
    await states.create("n2", 5, None, None, ttl=-1)
    assert await states.peek("n2") is None


@needs_db
async def test_pending_login_keeps_token_encrypted(db: Database) -> None:
    pending = OAuthPendingRepository(db, TokenCipher("k"))
    await pending.save(
        nonce="n",
        csrf="c",
        state={"user_id": 5, "chat_id": None, "message_id": None},
        token="secret-token",
        token_expires_at=int(time.time()) + 100,
        viewer={"name": "Ann"},
        ttl=60,
    )
    item = await pending.get("n")
    assert item is not None
    assert item["token"] == "secret-token"
    assert item["viewer"]["name"] == "Ann"
    await pending.delete("n")
    assert await pending.get("n") is None


@needs_db
async def test_fsm_storage(db: Database) -> None:
    storage = PostgresStorage(db)
    key = StorageKey(bot_id=1, chat_id=2, user_id=3)
    assert await storage.get_state(key) is None
    await storage.set_state(key, "Input:text")
    await storage.set_data(key, {"filter": {"genres": ["Drama"]}})
    assert await storage.get_state(key) == "Input:text"
    assert (await storage.get_data(key))["filter"]["genres"] == ["Drama"]
    await storage.set_state(key, None)
    assert await storage.get_data(key) != {}


@needs_db
async def test_import_from_sqlite(db: Database, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    source = tmp_path / "bot.db"
    conn = sqlite3.connect(source)
    conn.execute(
        "CREATE TABLE users (user_id INTEGER, lang TEXT, anilist_id INTEGER, anilist_name TEXT, token_enc TEXT, "
        "token_expires_at INTEGER, score_format TEXT, title_language TEXT, notifications TEXT, keyboard_layout TEXT, "
        "last_notification INTEGER, blocked INTEGER, created_at INTEGER, updated_at INTEGER)"
    )
    conn.execute(
        "INSERT INTO users VALUES (1, 'en', 77, 'Ann', 'enc', 1900000000, 'POINT_100', 'ROMAJI', ?, ?, 0, 0, 1700000000, 0)",
        (json.dumps({"related": False}), json.dumps([["search", "list"]])),
    )
    conn.execute("CREATE TABLE kv (key TEXT, value TEXT)")
    conn.execute("INSERT INTO kv VALUES ('airing_checked', '1700000000'), ('legacy_imported', '1')")
    conn.commit()
    conn.close()
    assert TEST_URL
    monkeypatch.setenv("DATABASE_URL", TEST_URL)
    counts = await import_sqlite(source)
    assert counts["users"] == 1
    assert counts["kv"] == 1
    async with db.connection() as pg:
        row = (await pg.execute(select(UserRow).where(UserRow.user_id == 1))).one()
    assert row.token_enc == "enc"
    assert row.notifications["related"] is False
    assert row.keyboard_layout[0] == ["search", "list"]


def test_normalize_layout() -> None:
    assert normalize_layout(None)[-1] == ["app", "settings"]
    assert normalize_layout([["search", "search", "bogus"]]) == [["search"], ["settings"]]
    assert normalize_layout([["menu_search", "menu_mylist"]])[0] == ["search", "list"]


def test_normalize_appearance() -> None:
    assert normalize_appearance(None) == {"theme": "dark", "accent": "crimson"}
    assert normalize_appearance({"theme": "glass", "accent": "teal"}) == {"theme": "glass", "accent": "teal"}
    assert normalize_appearance({"theme": "neon", "accent": "<script>"}) == {"theme": "dark", "accent": "crimson"}


@needs_db
async def test_appearance_roundtrip(db: Database) -> None:
    users = UserRepository(db, TokenCipher("k"))
    await users.get_or_create(7)
    saved = await users.set_appearance(7, {"theme": "light", "accent": "blue", "extra": "x"})
    assert saved == {"theme": "light", "accent": "blue"}
    user = await users.get(7)
    assert user is not None
    assert user.appearance == saved
