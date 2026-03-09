"""
Fuzzy search engine adapted from ReZeroE/AnilistPython (MIT License)
https://github.com/ReZeroE/AnilistPython
"""
import json
import os
import copy


class FuzzySearchEngine:
    def __init__(self):
        self.storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'anime_db')
        self.id_dict_path = os.path.join(self.storage_dir, "anime_by_id.json")
        self.tag_dict_path = os.path.join(self.storage_dir, "anime_by_tag.json")
        self.cache_path = os.path.join(self.storage_dir, "search_cache.json")
        self.cache_size = 500
        self._available = os.path.exists(self.id_dict_path) and os.path.exists(self.tag_dict_path)

    @property
    def available(self) -> bool:
        return self._available

    def search(self, anime_name: str, threshold: float = 0.65, limit: int = 8) -> list:
        if not self._available:
            return []

        anime_name = anime_name.lower().strip()
        tag_dict = self._load(self.tag_dict_path)
        id_dict = self._load(self.id_dict_path)

        cache = {}
        if os.path.exists(self.cache_path):
            try:
                cache = self._load(self.cache_path)
            except Exception:
                cache = {}

        results = {}

        for tag_key, anime_id in cache.items():
            tags = tag_key.split("|=|") if "|=|" in tag_key else [tag_key]
            for tag in tags:
                score = self._levenshtein_ratio(anime_name, tag.lower())
                if score >= threshold:
                    results[str(anime_id)] = max(results.get(str(anime_id), 0), score)

        if len(results) < 3:
            for tag_key, anime_id in tag_dict.items():
                tags = tag_key.split("|=|") if "|=|" in tag_key else [tag_key]
                for tag in tags:
                    score = self._levenshtein_ratio(anime_name, tag.lower())
                    if score >= threshold:
                        sid = str(anime_id)
                        results[sid] = max(results.get(sid, 0), score)
                        cache[tag_key] = anime_id

        if len(cache) > self.cache_size:
            items = list(cache.items())[-self.cache_size:]
            cache = dict(items)
        try:
            with open(self.cache_path, 'w') as f:
                json.dump(cache, f)
        except Exception:
            pass

        sorted_ids = sorted(results, key=lambda x: results[x], reverse=True)[:limit]

        output = []
        for aid in sorted_ids:
            entry = id_dict.get(aid) or id_dict.get(int(aid) if isinstance(aid, str) else str(aid))
            if entry:
                entry["_score"] = round(results[aid] * 100)
                output.append(entry)

        return output

    def _levenshtein_ratio(self, s: str, t: str) -> float:
        if t.find(s) != -1:
            return 1.0
        if not s or not t:
            return 0.0

        rows, cols = len(s) + 1, len(t) + 1
        dist = [[0] * cols for _ in range(rows)]
        for i in range(rows):
            dist[i][0] = i
        for j in range(cols):
            dist[0][j] = j

        for col in range(1, cols):
            for row in range(1, rows):
                cost = 0 if s[row - 1] == t[col - 1] else 2
                dist[row][col] = min(
                    dist[row - 1][col] + 1,
                    dist[row][col - 1] + 1,
                    dist[row - 1][col - 1] + cost
                )

        return ((len(s) + len(t)) - dist[len(s)][len(t)]) / (len(s) + len(t))

    def _load(self, path: str) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


fuzzy_engine = FuzzySearchEngine()
