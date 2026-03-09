# Fuzzy search removed — anime_db dependency eliminated
# Falls back to regular AniList API search

class FuzzySearchEngine:
    @property
    def available(self) -> bool:
        return False

    def search(self, *args, **kwargs) -> list:
        return []

fuzzy_engine = FuzzySearchEngine()
