import hashlib
import json
import time
from typing import Any

from app.db.database import Database
from app.db.models import DEFAULT_LAYOUT, MENU_BUTTONS, NOTIFICATION_DEFAULTS, User
from app.security import TokenCipher


def _now() -> int:
    return int(time.time())


class UserRepository:
    def __init__(self, db: Database, cipher: TokenCipher) -> None:
        self._db = db
        self._cipher = cipher

    def _from_row(self, row: Any) -> User:
        try:
            saved = json.loads(row["notifications"]) if row["notifications"] else {}
        except json.JSONDecodeError:
            saved = {}
        try:
            layout = json.loads(row["keyboard_layout"]) if row["keyboard_layout"] else None
        except json.JSONDecodeError:
            layout = None
        return User(
            user_id=row["user_id"],
            lang=row["lang"],
            anilist_id=row["anilist_id"],
            anilist_name=row["anilist_name"],
            token=self._cipher.decrypt(row["token_enc"]),
            token_expires_at=row["token_expires_at"],
            score_format=row["score_format"],
            title_language=row["title_language"],
            notifications={**NOTIFICATION_DEFAULTS, **{k: v for k, v in saved.items() if k in NOTIFICATION_DEFAULTS}},
            keyboard_layout=normalize_layout(layout),
            last_notification=row["last_notification"],
        )

    async def get(self, user_id: int) -> User | None:
        row = await self._db.fetchone("SELECT * FROM users WHERE user_id = ?", (user_id,))
        return self._from_row(row) if row else None

    async def get_or_create(self, user_id: int, language_code: str | None = None) -> User:
        user = await self.get(user_id)
        if user:
            return user
        lang = "ru" if (language_code or "ru").split("-")[0] in {"ru", "uk", "be", "kk"} else "en"
        now = _now()
        await self._db.execute(
            "INSERT OR IGNORE INTO users (user_id, lang, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (user_id, lang, now, now),
        )
        user = User(user_id=user_id, lang=lang)
        user.is_new = True
        return user

    async def set_lang(self, user_id: int, lang: str) -> None:
        await self._db.execute("UPDATE users SET lang = ?, updated_at = ? WHERE user_id = ?", (lang, _now(), user_id))

    async def set_auth(
        self,
        user_id: int,
        *,
        token: str,
        expires_at: int,
        anilist_id: int,
        anilist_name: str,
        score_format: str,
        title_language: str,
    ) -> None:
        now = _now()
        await self._db.execute(
            """
            INSERT INTO users (user_id, created_at, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO NOTHING
            """,
            (user_id, now, now),
        )
        await self._db.execute(
            """
            UPDATE users SET token_enc = ?, token_expires_at = ?, anilist_id = ?, anilist_name = ?,
                score_format = ?, title_language = ?, last_notification = 0, blocked = 0, updated_at = ?
            WHERE user_id = ?
            """,
            (
                self._cipher.encrypt(token),
                expires_at,
                anilist_id,
                anilist_name,
                score_format,
                title_language,
                now,
                user_id,
            ),
        )

    async def update_profile(self, user_id: int, *, anilist_name: str, score_format: str, title_language: str) -> None:
        await self._db.execute(
            "UPDATE users SET anilist_name = ?, score_format = ?, title_language = ?, updated_at = ? WHERE user_id = ?",
            (anilist_name, score_format, title_language, _now(), user_id),
        )

    async def clear_auth(self, user_id: int) -> None:
        await self._db.execute(
            """
            UPDATE users SET token_enc = NULL, token_expires_at = 0, anilist_id = NULL, anilist_name = NULL,
                updated_at = ? WHERE user_id = ?
            """,
            (_now(), user_id),
        )
        await self._db.execute("DELETE FROM image_cache WHERE user_id = ?", (user_id,))

    async def set_notifications(self, user_id: int, settings: dict[str, bool]) -> None:
        clean = {k: bool(settings[k]) for k in NOTIFICATION_DEFAULTS if k in settings}
        await self._db.execute(
            "UPDATE users SET notifications = ?, updated_at = ? WHERE user_id = ?",
            (json.dumps(clean), _now(), user_id),
        )

    async def set_layout(self, user_id: int, layout: list[list[str]]) -> None:
        await self._db.execute(
            "UPDATE users SET keyboard_layout = ?, updated_at = ? WHERE user_id = ?",
            (json.dumps(normalize_layout(layout)), _now(), user_id),
        )

    async def set_last_notification(self, user_id: int, notification_id: int) -> None:
        await self._db.execute("UPDATE users SET last_notification = ? WHERE user_id = ?", (notification_id, user_id))

    async def set_blocked(self, user_id: int, blocked: bool) -> None:
        await self._db.execute("UPDATE users SET blocked = ? WHERE user_id = ?", (int(blocked), user_id))

    async def notifiable(self) -> list[User]:
        rows = await self._db.fetchall(
            "SELECT * FROM users WHERE token_enc IS NOT NULL AND anilist_id IS NOT NULL AND blocked = 0"
        )
        users = [self._from_row(row) for row in rows]
        return [u for u in users if u.token and u.notifications.get("enabled")]

    async def stats(self) -> tuple[int, int]:
        row = await self._db.fetchone("SELECT COUNT(*), COUNT(token_enc) FROM users")
        return (row[0], row[1]) if row else (0, 0)


def normalize_layout(layout: Any) -> list[list[str]]:
    if not isinstance(layout, list):
        return [row[:] for row in DEFAULT_LAYOUT]
    aliases = {
        "menu_search": "search",
        "menu_mylist": "list",
        "menu_trending": "trending",
        "menu_schedule": "schedule",
        "menu_season": "season",
        "menu_profile": "profile",
        "menu_settings": "settings",
    }
    seen: set[str] = set()
    rows: list[list[str]] = []
    for raw_row in layout:
        if not isinstance(raw_row, list):
            continue
        row = []
        for key in raw_row:
            key = aliases.get(key, key)
            if key in MENU_BUTTONS and key not in seen:
                seen.add(key)
                row.append(key)
        if row:
            rows.append(row[:3])
    if "settings" not in seen:
        rows.append(["settings"])
    return rows


class ImageCacheRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def get(self, user_id: int, kind: str, digest: str, ttl: int) -> str | None:
        row = await self._db.fetchone(
            "SELECT file_id, digest, created_at FROM image_cache WHERE user_id = ? AND kind = ?",
            (user_id, kind),
        )
        if not row or row["digest"] != digest or _now() - row["created_at"] > ttl:
            return None
        return row["file_id"]

    async def set(self, user_id: int, kind: str, digest: str, file_id: str) -> None:
        await self._db.execute(
            "INSERT OR REPLACE INTO image_cache (user_id, kind, digest, file_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, kind, digest, file_id, _now()),
        )

    async def clear(self, user_id: int) -> None:
        await self._db.execute("DELETE FROM image_cache WHERE user_id = ?", (user_id,))


class NotificationLog:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def mark(self, user_id: int, kind: str, media_id: int, episode: int = 0) -> bool:
        cursor = await self._db.conn.execute(
            "INSERT OR IGNORE INTO sent_notifications (user_id, kind, media_id, episode, sent_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, kind, media_id, episode, _now()),
        )
        await self._db.conn.commit()
        return cursor.rowcount > 0

    async def prune(self, older_than: int) -> None:
        await self._db.execute("DELETE FROM sent_notifications WHERE sent_at < ?", (_now() - older_than,))


class NavigationRepository:
    def __init__(self, db: Database, depth: int = 12) -> None:
        self._db = db
        self._depth = depth

    async def get(self, target: str) -> list[str]:
        row = await self._db.fetchone("SELECT stack FROM navigation WHERE target = ?", (target,))
        if not row:
            return []
        try:
            stack = json.loads(row["stack"])
        except json.JSONDecodeError:
            return []
        return [str(item) for item in stack] if isinstance(stack, list) else []

    async def set(self, target: str, stack: list[str]) -> None:
        await self._db.execute(
            "INSERT OR REPLACE INTO navigation (target, stack, updated_at) VALUES (?, ?, ?)",
            (target, json.dumps(stack[-self._depth :]), _now()),
        )

    async def prune(self, older_than: int) -> None:
        await self._db.execute("DELETE FROM navigation WHERE updated_at < ?", (_now() - older_than,))


class OAuthStateRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def create(self, nonce: str, user_id: int, chat_id: int | None, message_id: int | None, ttl: int) -> None:
        await self._db.execute("DELETE FROM oauth_states WHERE expires_at < ?", (_now(),))
        await self._db.execute(
            "INSERT INTO oauth_states (nonce, user_id, chat_id, message_id, expires_at) VALUES (?, ?, ?, ?, ?)",
            (nonce, user_id, chat_id, message_id, _now() + ttl),
        )

    async def peek(self, nonce: str) -> dict[str, Any] | None:
        row = await self._db.fetchone("SELECT * FROM oauth_states WHERE nonce = ? AND expires_at >= ?", (nonce, _now()))
        return dict(row) if row else None

    async def consume(self, nonce: str) -> dict[str, Any] | None:
        state = await self.peek(nonce)
        await self._db.execute("DELETE FROM oauth_states WHERE nonce = ?", (nonce,))
        return state


class TextRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def put(self, value: str) -> str:
        digest = hashlib.blake2b(value.encode(), digest_size=5).hexdigest()
        await self._db.execute(
            "INSERT OR REPLACE INTO short_texts (digest, value, created_at) VALUES (?, ?, ?)",
            (digest, value, _now()),
        )
        return digest

    async def get(self, digest: str) -> str | None:
        row = await self._db.fetchone("SELECT value FROM short_texts WHERE digest = ?", (digest,))
        return row["value"] if row else None


class KeyValueRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def get(self, key: str) -> str | None:
        row = await self._db.fetchone("SELECT value FROM kv WHERE key = ?", (key,))
        return row["value"] if row else None

    async def set(self, key: str, value: str) -> None:
        await self._db.execute("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", (key, value))
