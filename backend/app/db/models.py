from dataclasses import dataclass, field

NOTIFICATION_DEFAULTS: dict[str, bool] = {
    "enabled": True,
    "airing_watching": True,
    "airing_planning": False,
    "airing_paused": False,
    "airing_dropped": False,
    "related": True,
    "anilist_activity": False,
}

DEFAULT_LAYOUT: list[list[str]] = [
    ["search", "list"],
    ["trending", "schedule"],
    ["season", "profile"],
    ["app", "settings"],
]

MENU_BUTTONS: tuple[str, ...] = (
    "search",
    "list",
    "trending",
    "schedule",
    "season",
    "profile",
    "app",
    "settings",
)


@dataclass(slots=True)
class User:
    user_id: int
    lang: str = "ru"
    anilist_id: int | None = None
    anilist_name: str | None = None
    token: str | None = None
    token_expires_at: int = 0
    score_format: str = "POINT_10"
    title_language: str = "ENGLISH"
    notifications: dict[str, bool] = field(default_factory=lambda: dict(NOTIFICATION_DEFAULTS))
    keyboard_layout: list[list[str]] = field(default_factory=lambda: [row[:] for row in DEFAULT_LAYOUT])
    last_notification: int = 0
    is_new: bool = False

    @property
    def authorized(self) -> bool:
        return bool(self.token and self.anilist_id)

    @property
    def title_pref(self) -> str:
        if not self.authorized:
            return "english"
        return {"ROMAJI": "romaji", "ROMAJI_STYLISED": "romaji"}.get(self.title_language, "user")
