import tomllib
from pathlib import Path
from typing import Any

LOCALES_DIR = Path(__file__).parent / "locales"
LANGUAGES = ("ru", "en")
FALLBACK = "en"


class Translator:
    __slots__ = ("_fallback", "_strings", "lang")

    def __init__(self, lang: str, strings: dict[str, str], fallback: dict[str, str]) -> None:
        self.lang = lang
        self._strings = strings
        self._fallback = fallback

    def __call__(self, key: str, /, **kwargs: Any) -> str:
        text = self._strings.get(key) or self._fallback.get(key) or key
        return text.format(**kwargs) if kwargs else text

    def has(self, key: str) -> bool:
        return key in self._strings


def _flatten(data: dict[str, Any], prefix: str = "") -> dict[str, str]:
    result: dict[str, str] = {}
    for key, value in data.items():
        full = f"{prefix}{key}"
        if isinstance(value, dict):
            result.update(_flatten(value, f"{full}."))
        else:
            result[full] = str(value).rstrip("\n") if isinstance(value, str) else str(value)
    return result


class I18n:
    def __init__(self, directory: Path = LOCALES_DIR) -> None:
        self.strings: dict[str, dict[str, str]] = {}
        for lang in LANGUAGES:
            with (directory / f"{lang}.toml").open("rb") as fh:
                self.strings[lang] = _flatten(tomllib.load(fh))
        self._translators = {lang: Translator(lang, self.strings[lang], self.strings[FALLBACK]) for lang in LANGUAGES}

    def get(self, lang: str | None) -> Translator:
        return self._translators.get(lang or FALLBACK, self._translators[FALLBACK])


i18n = I18n()
