"""
Advanced filter engine adapted from ReZeroE/AnilistPython (MIT License)
https://github.com/ReZeroE/AnilistPython
"""
import json
import os


GENRES = [
    "action", "adventure", "comedy", "drama", "ecchi", "fantasy",
    "horror", "mahou shoujo", "mecha", "music", "mystery", "psychological",
    "romance", "sci-fi", "slice of life", "sports", "supernatural", "thriller"
]

GENRE_DISPLAY = {
    "action": "Action", "adventure": "Adventure", "comedy": "Comedy",
    "drama": "Drama", "ecchi": "Ecchi", "fantasy": "Fantasy",
    "horror": "Horror", "mahou shoujo": "Mahou Shoujo", "mecha": "Mecha",
    "music": "Music", "mystery": "Mystery", "psychological": "Psychological",
    "romance": "Romance", "sci-fi": "Sci-Fi", "slice of life": "Slice of Life",
    "sports": "Sports", "supernatural": "Supernatural", "thriller": "Thriller"
}

YEARS = [str(y) for y in range(2024, 1989, -1)]

SCORE_RANGES = {
    "90+": (90, 100),
    "80+": (80, 100),
    "70+": (70, 100),
    "60+": (60, 100),
    "50+": (50, 100),
}


class FilterEngine:
    def __init__(self):
        self.storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'anime_db')
        self.id_dict_path = os.path.join(self.storage_dir, "anime_by_id.json")
        self.genre_dict_path = os.path.join(self.storage_dir, "anime_by_genre.json")
        self.score_dict_path = os.path.join(self.storage_dir, "anime_by_score.json")
        self.year_dict_path = os.path.join(self.storage_dir, "anime_by_year.json")
        self._available = all(os.path.exists(p) for p in [
            self.id_dict_path, self.genre_dict_path,
            self.score_dict_path, self.year_dict_path
        ])

    @property
    def available(self) -> bool:
        return self._available

    def search(self, genre: str = None, year: str = None, score_range: str = None, limit: int = 50) -> list:
        if not self._available:
            return []

        genre_ids = set()
        year_ids = set()
        score_ids = set()

        if genre:
            genre_dict = self._load(self.genre_dict_path)
            key = genre.lower().strip()
            if key == "scifi":
                key = "sci-fi"
            ids = genre_dict.get(key, [])
            genre_ids = set(str(i) for i in ids)

        if year:
            year_dict = self._load(self.year_dict_path)
            ids = year_dict.get(str(year), [])
            year_ids = set(str(i) for i in ids)

        if score_range and score_range in SCORE_RANGES:
            score_dict = self._load(self.score_dict_path)
            min_s, max_s = SCORE_RANGES[score_range]
            ids = []
            for k, v in score_dict.items():
                try:
                    if min_s <= int(k) <= max_s:
                        ids.extend(v)
                except Exception:
                    pass
            score_ids = set(str(i) for i in ids)

        active = [s for s in [genre_ids, year_ids, score_ids] if s]
        if not active:
            return []

        result_ids = active[0]
        for s in active[1:]:
            result_ids = result_ids & s

        id_dict = self._load(self.id_dict_path)
        results = []
        for aid in list(result_ids)[:limit]:
            entry = id_dict.get(aid) or id_dict.get(str(aid))
            if entry:
                results.append(entry)

        results.sort(key=lambda x: x.get("averageScore") or 0, reverse=True)
        return results

    def _load(self, path: str) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


filter_engine = FilterEngine()
