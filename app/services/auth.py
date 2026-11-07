import logging
from dataclasses import dataclass

from app.anilist import queries as q
from app.anilist.client import AniListError
from app.anilist.oauth import token_expiry
from app.container import Container

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class Viewer:
    id: int
    name: str
    score_format: str
    title_language: str
    avatar: str | None


async def fetch_viewer(app: Container, token: str) -> Viewer:
    data = await app.anilist.query(q.VIEWER_BRIEF, token=token)
    viewer = data.get("Viewer")
    if not viewer:
        raise AniListError("Invalid token", 401)
    return Viewer(
        id=viewer["id"],
        name=viewer["name"],
        score_format=((viewer.get("mediaListOptions") or {}).get("scoreFormat")) or "POINT_10",
        title_language=((viewer.get("options") or {}).get("titleLanguage")) or "ENGLISH",
        avatar=(viewer.get("avatar") or {}).get("large"),
    )


async def link_account(app: Container, user_id: int, token: str, expires_at: int = 0) -> Viewer:
    viewer = await fetch_viewer(app, token)
    await app.users.set_auth(
        user_id,
        token=token,
        expires_at=expires_at or token_expiry(token),
        anilist_id=viewer.id,
        anilist_name=viewer.name,
        score_format=viewer.score_format,
        title_language=viewer.title_language,
    )
    await app.images.clear(user_id)
    log.info("User %s linked AniList account %s", user_id, viewer.id)
    return viewer
