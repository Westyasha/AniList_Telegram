import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest

from app.security import InitDataError, TokenCipher, validate_init_data

BOT_TOKEN = "123456:TEST-TOKEN"


def sign(fields: dict[str, str], token: str = BOT_TOKEN) -> str:
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    digest = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode({**fields, "hash": digest})


def make_fields(auth_date: int | None = None) -> dict[str, str]:
    return {
        "auth_date": str(auth_date or int(time.time())),
        "query_id": "AAE",
        "user": json.dumps({"id": 42, "first_name": "Ann", "username": "ann"}),
        "start_param": "media_1",
    }


def test_valid_init_data() -> None:
    identity = validate_init_data(sign(make_fields()), BOT_TOKEN)
    assert identity.user_id == 42
    assert identity.username == "ann"
    assert identity.start_param == "media_1"


def test_tampered_init_data() -> None:
    raw = sign(make_fields()).replace("Ann", "Bob")
    with pytest.raises(InitDataError):
        validate_init_data(raw, BOT_TOKEN)


def test_wrong_bot_token() -> None:
    with pytest.raises(InitDataError):
        validate_init_data(sign(make_fields(), "999:OTHER"), BOT_TOKEN)


def test_expired_init_data() -> None:
    with pytest.raises(InitDataError):
        validate_init_data(sign(make_fields(int(time.time()) - 200000)), BOT_TOKEN)


def test_missing_hash() -> None:
    with pytest.raises(InitDataError):
        validate_init_data(urlencode(make_fields()), BOT_TOKEN)


def test_token_cipher_roundtrip() -> None:
    cipher = TokenCipher("secret")
    encrypted = cipher.encrypt("token-value")
    assert encrypted != "token-value"
    assert cipher.decrypt(encrypted) == "token-value"
    assert TokenCipher("another").decrypt(encrypted) is None
    assert cipher.decrypt(None) is None
