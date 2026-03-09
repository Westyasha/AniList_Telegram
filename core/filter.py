# Filter uses AniList API directly — no local anime_db needed

GENRE_DISPLAY = {
    "Action": "⚔️ Экшен", "Adventure": "🗺 Приключения", "Comedy": "😂 Комедия",
    "Drama": "🎭 Драма", "Fantasy": "🧙 Фэнтези", "Horror": "👻 Хоррор",
    "Mecha": "🤖 Меха", "Music": "🎵 Музыка", "Mystery": "🔍 Мистика",
    "Psychological": "🧠 Психологическое", "Romance": "💕 Романтика",
    "Sci-Fi": "🚀 Фантастика", "Slice of Life": "🌸 Повседневность",
    "Sports": "⚽ Спорт", "Supernatural": "✨ Сверхъестественное",
    "Thriller": "😰 Триллер", "Ecchi": "🔞 Этти", "Harem": "💞 Гарем",
    "Isekai": "🌀 Исекай", "Shounen": "💪 Сёнэн", "Shoujo": "🌺 Сёдзё",
    "Josei": "👩 Дзёсэй", "Seinen": "🧔 Сэйнэн",
}

YEARS = [str(y) for y in range(2025, 1989, -1)]

SCORE_RANGES = ["90+", "80+", "70+", "60+", "50+"]


class FilterEngine:
    async def search(self, genre=None, year=None, score=None, page=1, per_page=20) -> list:
        from core.api import anilist_query

        score_val = int(score.replace("+", "")) if score else None
        year_val = int(year) if year else None

        query = """
        query ($page: Int, $perPage: Int, $genre: String, $year: Int, $score: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage total }
            media(
              type: ANIME
              sort: SCORE_DESC
              genre: $genre
              seasonYear: $year
              averageScore_greater: $score
              status_not: NOT_YET_RELEASED
            ) {
              id
              title { romaji english }
              averageScore
              format
              episodes
              coverImage { extraLarge large }
              genres
              startDate { year }
            }
          }
        }
        """
        variables = {"page": page, "perPage": per_page}
        if genre:
            variables["genre"] = genre
        if year_val:
            variables["year"] = year_val
        if score_val:
            variables["score"] = score_val

        result = await anilist_query(query, variables)
        page_data = result.get("data", {}).get("Page", {})
        return page_data.get("media", []), page_data.get("pageInfo", {})


filter_engine = FilterEngine()
