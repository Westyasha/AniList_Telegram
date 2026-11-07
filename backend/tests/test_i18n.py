import re
from pathlib import Path

from app.i18n import i18n

ROOT = Path(__file__).resolve().parents[1] / "app"
STATIC_KEY = re.compile(r"""_\(\s*["']([a-z_]+\.[A-Za-z0-9_.]*[A-Za-z0-9])["']\s*[,)]""")
DYNAMIC_FAMILIES = {
    "status": [
        "current",
        "current_manga",
        "planning",
        "completed",
        "repeating",
        "repeating_manga",
        "paused",
        "dropped",
    ],
    "score_format": ["point_100", "point_10_decimal", "point_10", "point_5", "point_3"],
    "season": ["winter", "spring", "summer", "fall"],
    "weekday": [str(i) for i in range(7)],
    "weekday_short": [str(i) for i in range(7)],
    "search": ["what_A", "what_M", "what_C", "what_P", "what_U"],
    "notify": ["airing_watching", "airing_planning", "airing_paused", "airing_dropped", "related", "anilist_activity"],
    "help": [
        "search",
        "list",
        "notify",
        "inline",
        "app",
        "search_button",
        "list_button",
        "notify_button",
        "inline_button",
        "app_button",
    ],
    "web": ["fail_expired", "fail_exchange", "fail_rate", "fail_cancelled"],
    "sort": ["popularity_desc", "score_desc", "trending_desc", "start_date_desc"],
    "menu": ["search", "list", "trending", "schedule", "season", "profile", "settings", "app"],
    "commands": ["start", "search", "anime", "manga", "list", "schedule", "trending", "season", "user", "card"],
}


def used_keys() -> set[str]:
    keys: set[str] = set()
    for path in [*ROOT.rglob("*.py"), *ROOT.rglob("*.html")]:
        keys.update(STATIC_KEY.findall(path.read_text(encoding="utf-8")))
    return keys


def test_locales_have_identical_keys() -> None:
    ru, en = set(i18n.strings["ru"]), set(i18n.strings["en"])
    assert ru - en == set()
    assert en - ru == set()


def test_every_used_key_exists() -> None:
    missing = sorted(k for k in used_keys() if k not in i18n.strings["en"])
    assert missing == []


def test_dynamic_families_exist() -> None:
    for prefix, names in DYNAMIC_FAMILIES.items():
        for name in names:
            for lang in ("ru", "en"):
                assert f"{prefix}.{name}" in i18n.strings[lang], f"{lang}: {prefix}.{name}"


def test_placeholders_match() -> None:
    pattern = re.compile(r"\{(\w+)\}")
    for key, value in i18n.strings["en"].items():
        assert set(pattern.findall(value)) == set(pattern.findall(i18n.strings["ru"][key])), key


def test_translator_falls_back() -> None:
    assert i18n.get("de")("nav.back") == i18n.get("en")("nav.back")
    assert i18n.get("ru")("unknown.key") == "unknown.key"
