from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

PIN_REDIRECT_URI = "https://anilist.co/api/v2/oauth/pin"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    bot_token: SecretStr
    secret_key: SecretStr

    anilist_client_id: int
    anilist_client_secret: SecretStr
    anilist_redirect_uri: str = PIN_REDIRECT_URI
    anilist_rate_limit: int = 27

    public_url: str = ""
    web_host: str = "127.0.0.1"
    web_port: int = 8090
    webapp_dist: Path = Path("webapp/dist")

    database_path: Path = Path("data/bot.db")
    legacy_database_path: Path = Path("users.db")

    notifier_interval: int = 300
    renderer_concurrency: int = 2
    log_level: str = "INFO"

    @property
    def pin_flow(self) -> bool:
        return self.anilist_redirect_uri.rstrip("/") == PIN_REDIRECT_URI

    @property
    def webapp_url(self) -> str:
        return f"{self.public_url.rstrip('/')}/" if self.public_url else ""

    @property
    def callback_url(self) -> str:
        return f"{self.public_url.rstrip('/')}/auth/callback" if self.public_url else ""
