import json
import sqlite3
from pathlib import Path

from app.db.database import Database
from app.db.repositories import NotificationLog, UserRepository, normalize_layout
from app.security import TokenCipher


def make_legacy(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE users (user_id INTEGER PRIMARY KEY, token TEXT, anilist_id INTEGER, lang TEXT, "
        "notifications INTEGER, keyboard_layout TEXT, notif_settings TEXT)"
    )
    conn.execute(
        "INSERT INTO users VALUES (1, 'tok', 77, 'en', 1, ?, ?)",
        (json.dumps([["menu_search", "menu_mylist"]]), json.dumps({"airing_planned": True, "enabled": True})),
    )
    conn.execute("INSERT INTO users VALUES (2, NULL, NULL, 'ru', 0, NULL, NULL)")
    conn.commit()
    conn.close()


async def test_legacy_import_encrypts_tokens(tmp_path: Path) -> None:
    legacy = tmp_path / "users.db"
    make_legacy(legacy)
    cipher = TokenCipher("k")
    db = Database(tmp_path / "data" / "bot.db")
    await db.connect()
    await db.migrate(cipher, legacy)
    await db.migrate(cipher, legacy)
    users = UserRepository(db, cipher)
    first = await users.get(1)
    assert first is not None
    assert first.token == "tok"
    assert first.anilist_id == 77
    assert first.lang == "en"
    assert first.notifications["airing_planning"] is True
    assert first.keyboard_layout[0] == ["search", "list"]
    row = await db.fetchone("SELECT token_enc FROM users WHERE user_id = 1")
    assert row is not None
    assert row["token_enc"] != "tok"
    second = await users.get(2)
    assert second is not None
    assert second.notifications["enabled"] is False
    await db.close()


async def test_notification_log_dedupes(tmp_path: Path) -> None:
    db = Database(tmp_path / "bot.db")
    await db.connect()
    await db.migrate(TokenCipher("k"))
    log = NotificationLog(db)
    assert await log.mark(1, "airing", 10, 3) is True
    assert await log.mark(1, "airing", 10, 3) is False
    await db.close()


def test_normalize_layout() -> None:
    assert normalize_layout(None)[-1] == ["app", "settings"]
    assert normalize_layout([["search", "search", "bogus"]]) == [["search"], ["settings"]]
