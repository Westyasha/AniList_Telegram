from dataclasses import dataclass
from typing import Any

from aiogram import Bot
from aiogram.fsm.context import FSMContext

from app.anilist import helpers
from app.anilist.client import AniListError
from app.container import Container
from app.db.models import User
from app.i18n import Translator


class AuthRequiredError(Exception):
    pass


@dataclass(slots=True)
class Ctx:
    bot: Bot
    app: Container
    user: User
    _: Translator
    state: FSMContext | None = None
    depth: int = 0
    target: str | None = None

    @property
    def lang(self) -> str:
        return self.user.lang

    def title(self, media: dict[str, Any] | None) -> str:
        return helpers.title(media, self.user.title_pref)

    def require_auth(self) -> None:
        if not self.user.authorized:
            raise AuthRequiredError

    async def gql(
        self,
        document: str,
        variables: dict[str, Any] | None = None,
        *,
        auth: bool = False,
        personal: bool = False,
        ttl: float = 0,
    ) -> dict[str, Any]:
        if auth:
            self.require_auth()
        token = self.user.token if (auth or personal) and self.user.authorized else None
        try:
            return await self.app.anilist.query(document, variables, token=token, ttl=ttl)
        except AniListError as exc:
            if token and exc.unauthorized:
                await self.app.users.clear_auth(self.user.user_id)
                self.user.token = None
                self.user.anilist_id = None
                raise AuthRequiredError from exc
            raise
