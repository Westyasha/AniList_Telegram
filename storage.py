import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "users.db")


def init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id     INTEGER PRIMARY KEY,
                token       TEXT,
                anilist_id  INTEGER,
                lang        TEXT NOT NULL DEFAULT 'ru',
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                notifications  INTEGER DEFAULT 1,
                keyboard_layout TEXT
            )
        """)
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS users_updated_at
            AFTER UPDATE ON users
            BEGIN
                UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
            END
        """)


@contextmanager
def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _ensure_user(conn, user_id: int):
    conn.execute(
        "INSERT OR IGNORE INTO users (user_id) VALUES (?)",
        (user_id,)
    )


def get_token(user_id: int):
    with _conn() as conn:
        row = conn.execute(
            "SELECT token FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        return row["token"] if row else None


def set_token(user_id: int, token: str, anilist_id: int = None):
    with _conn() as conn:
        _ensure_user(conn, user_id)
        if anilist_id:
            conn.execute(
                "UPDATE users SET token = ?, anilist_id = ? WHERE user_id = ?",
                (token, anilist_id, user_id)
            )
        else:
            conn.execute(
                "UPDATE users SET token = ? WHERE user_id = ?",
                (token, user_id)
            )


def get_anilist_id(user_id: int):
    with _conn() as conn:
        row = conn.execute(
            "SELECT anilist_id FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        return row["anilist_id"] if row else None


def set_anilist_id(user_id: int, anilist_id: int):
    with _conn() as conn:
        _ensure_user(conn, user_id)
        conn.execute(
            "UPDATE users SET anilist_id = ? WHERE user_id = ?",
            (anilist_id, user_id)
        )


def remove_token(user_id: int):
    with _conn() as conn:
        conn.execute(
            "UPDATE users SET token = NULL, anilist_id = NULL WHERE user_id = ?",
            (user_id,)
        )


def get_lang(user_id: int) -> str:
    with _conn() as conn:
        row = conn.execute(
            "SELECT lang FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        return row["lang"] if row else "ru"


def set_lang(user_id: int, lang: str):
    with _conn() as conn:
        _ensure_user(conn, user_id)
        conn.execute(
            "UPDATE users SET lang = ? WHERE user_id = ?",
            (lang, user_id)
        )


def get_notifications_enabled(user_id: int) -> bool:
    with _conn() as conn:
        row = conn.execute(
            "SELECT notifications FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        return bool(row["notifications"]) if row and row["notifications"] is not None else True


def set_notifications_enabled(user_id: int, enabled: bool):
    with _conn() as conn:
        _ensure_user(conn, user_id)
        conn.execute(
            "UPDATE users SET notifications = ? WHERE user_id = ?",
            (int(enabled), user_id)
        )


def get_notifications_users() -> list:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT user_id FROM users WHERE token IS NOT NULL AND (notifications IS NULL OR notifications = 1)"
        ).fetchall()
        return [row["user_id"] for row in rows]


def get_keyboard_layout(user_id: int) -> list:
    with _conn() as conn:
        row = conn.execute(
            "SELECT keyboard_layout FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        if row and row["keyboard_layout"]:
            import json
            return json.loads(row["keyboard_layout"])
        return None


def set_keyboard_layout(user_id: int, layout: list):
    import json
    with _conn() as conn:
        _ensure_user(conn, user_id)
        conn.execute(
            "UPDATE users SET keyboard_layout = ? WHERE user_id = ?",
            (json.dumps(layout), user_id)
        )
