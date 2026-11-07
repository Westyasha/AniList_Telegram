import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qsl

from cryptography.fernet import Fernet, InvalidToken


class TokenCipher:
    def __init__(self, secret: str) -> None:
        key = hashlib.sha256(f"anilist-token:{secret}".encode()).digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(key))

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode()).decode()

    def decrypt(self, value: str | None) -> str | None:
        if not value:
            return None
        try:
            return self._fernet.decrypt(value.encode()).decode()
        except InvalidToken:
            return None


def new_nonce() -> str:
    return secrets.token_urlsafe(24)


@dataclass(frozen=True, slots=True)
class WebAppIdentity:
    user_id: int
    first_name: str
    last_name: str | None
    username: str | None
    photo_url: str | None
    language_code: str | None
    start_param: str | None
    auth_date: int


class InitDataError(ValueError):
    pass


def validate_init_data(init_data: str, bot_token: str, max_age: int = 86400) -> WebAppIdentity:
    if not init_data or len(init_data) > 4096:
        raise InitDataError("missing init data")
    pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=False)
    fields: dict[str, str] = {}
    for key, value in pairs:
        if key in fields:
            raise InitDataError("duplicate field")
        fields[key] = value
    received_hash = fields.pop("hash", "")
    if not received_hash:
        raise InitDataError("missing hash")
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise InitDataError("bad hash")
    try:
        auth_date = int(fields.get("auth_date", "0"))
    except ValueError as exc:
        raise InitDataError("bad auth_date") from exc
    if auth_date <= 0 or time.time() - auth_date > max_age:
        raise InitDataError("expired")
    try:
        user: dict[str, Any] = json.loads(fields.get("user") or "{}")
    except json.JSONDecodeError as exc:
        raise InitDataError("bad user") from exc
    if not isinstance(user, dict) or not isinstance(user.get("id"), int):
        raise InitDataError("missing user")
    return WebAppIdentity(
        user_id=user["id"],
        first_name=str(user.get("first_name") or ""),
        last_name=user.get("last_name"),
        username=user.get("username"),
        photo_url=user.get("photo_url"),
        language_code=user.get("language_code"),
        start_param=fields.get("start_param"),
        auth_date=auth_date,
    )
