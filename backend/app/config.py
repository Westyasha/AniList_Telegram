from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

PIN_REDIRECT_URI = "https://anilist.co/api/v2/oauth/pin"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")

    bot_token: SecretStr
    secret_key: SecretStr

    anilist_client_id: int
    anilist_client_secret: SecretStr
    anilist_redirect_uri: str = PIN_REDIRECT_URI
    anilist_rate_limit: int = 27

    public_url: str = ""
    web_host: str = "127.0.0.1"
    web_port: int = 8090
    database_url: SecretStr = SecretStr("postgresql+asyncpg://anilist:anilist@127.0.0.1:5432/anilist")
    database_pool_size: int = 5

    notifier_interval: int = 300
    renderer_concurrency: int = 2
    log_level: str = "INFO"
    admin_ids: str = ""

    @property
    def admins(self) -> frozenset[int]:
        return frozenset(int(part) for part in self.admin_ids.replace(";", ",").split(",") if part.strip().isdigit())

    @property
    def pin_flow(self) -> bool:
        return self.anilist_redirect_uri.rstrip("/") == PIN_REDIRECT_URI

    @property
    def webapp_url(self) -> str:
        return f"{self.public_url.rstrip('/')}/" if self.public_url else ""

    @property
    def callback_url(self) -> str:
        return f"{self.public_url.rstrip('/')}/auth/callback" if self.public_url else ""
