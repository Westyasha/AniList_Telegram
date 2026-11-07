import base64
import json
import time
from dataclasses import dataclass
from urllib.parse import urlencode

import aiohttp

from app.anilist.client import USER_AGENT, AniListError

AUTHORIZE_URL = "https://anilist.co/api/v2/oauth/authorize"
TOKEN_URL = "https://anilist.co/api/v2/oauth/token"


@dataclass(frozen=True, slots=True)
class OAuthToken:
    access_token: str
    expires_at: int


def authorize_url(client_id: int, redirect_uri: str, state: str | None = None) -> str:
    params: dict[str, str | int] = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
    }
    if state:
        params["state"] = state
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def token_expiry(token: str) -> int:
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
        return int(claims.get("exp") or 0)
    except (IndexError, ValueError, TypeError):
        return 0


async def exchange_code(
    session: aiohttp.ClientSession,
    *,
    client_id: int,
    client_secret: str,
    redirect_uri: str,
    code: str,
) -> OAuthToken:
    payload = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "code": code,
    }
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    async with session.post(TOKEN_URL, json=payload, headers=headers) as resp:
        body = await resp.json(content_type=None)
    if resp.status != 200 or not isinstance(body, dict) or not body.get("access_token"):
        message = body.get("message") or body.get("error") if isinstance(body, dict) else None
        raise AniListError(str(message or "Token exchange failed"), resp.status)
    token = str(body["access_token"])
    expires_at = token_expiry(token) or int(time.time()) + int(body.get("expires_in") or 31536000)
    return OAuthToken(token, expires_at)
