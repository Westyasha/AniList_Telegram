from dataclasses import dataclass

from app.anilist.client import AniListClient
from app.config import Settings
from app.db.database import Database
from app.db.repositories import (
    ImageCacheRepository,
    KeyValueRepository,
    NavigationRepository,
    NotificationLog,
    OAuthPendingRepository,
    OAuthStateRepository,
    TextRepository,
    UserRepository,
)
from app.security import TokenCipher
from app.services.cards.renderer import CardRenderer


@dataclass(slots=True)
class Container:
    settings: Settings
    db: Database
    cipher: TokenCipher
    anilist: AniListClient
    users: UserRepository
    images: ImageCacheRepository
    nav: NavigationRepository
    oauth: OAuthStateRepository
    pending: OAuthPendingRepository
    texts: TextRepository
    kv: KeyValueRepository
    sent: NotificationLog
    renderer: CardRenderer
    bot_username: str = ""

    @classmethod
    def build(cls, settings: Settings) -> "Container":
        db = Database(settings.database_url.get_secret_value(), settings.database_pool_size)
        cipher = TokenCipher(settings.secret_key.get_secret_value())
        return cls(
            settings=settings,
            db=db,
            cipher=cipher,
            anilist=AniListClient(rate_limit=settings.anilist_rate_limit),
            users=UserRepository(db, cipher),
            images=ImageCacheRepository(db),
            nav=NavigationRepository(db),
            oauth=OAuthStateRepository(db),
            pending=OAuthPendingRepository(db, cipher),
            texts=TextRepository(db),
            kv=KeyValueRepository(db),
            sent=NotificationLog(db),
            renderer=CardRenderer(concurrency=settings.renderer_concurrency),
        )
