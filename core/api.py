import aiohttp
from config import ANILIST_API_URL


async def anilist_query(query: str, variables: dict = None, token: str = None) -> dict:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = {"query": query, "variables": variables or {}}
    async with aiohttp.ClientSession() as session:
        async with session.post(ANILIST_API_URL, json=payload, headers=headers) as resp:
            return await resp.json()


# ─── SEARCH ──────────────────────────────────────────────────────────────────

Q_SEARCH_MEDIA = """
query ($search: String, $type: MediaType, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(search: $search, type: $type, sort: SEARCH_MATCH, isAdult: false) {
      id type format status episodes chapters averageScore meanScore popularity
      title { romaji english native }
      coverImage { extraLarge large }
      genres startDate { year } season seasonYear
    }
  }
}
"""

Q_SEARCH_CHAR = """
query ($search: String, $page: Int) {
  Page(page: $page, perPage: 6) {
    pageInfo { hasNextPage currentPage lastPage }
    characters(search: $search) {
      id favourites
      name { full native }
      image { large }
      media(perPage: 3, sort: POPULARITY_DESC) { nodes { id title { romaji } coverImage { extraLarge large } type } }
    }
  }
}
"""

Q_SEARCH_STAFF = """
query ($search: String, $page: Int) {
  Page(page: $page, perPage: 6) {
    pageInfo { hasNextPage currentPage lastPage }
    staff(search: $search) {
      id favourites languageV2
      name { full native }
      image { large }
      primaryOccupations
      staffMedia(perPage: 3, sort: POPULARITY_DESC) { nodes { id title { romaji } } }
    }
  }
}
"""

# ─── MEDIA DETAIL ─────────────────────────────────────────────────────────────

Q_MEDIA_DETAIL = """
query ($id: Int) {
  Media(id: $id) {
    id type format status season seasonYear popularity favourites
    title { romaji english native }
    coverImage { extraLarge large }
    bannerImage
    description(asHtml: false)
    episodes chapters volumes duration
    averageScore meanScore
    genres
    tags { name rank isMediaSpoiler }
    startDate { year month day }
    endDate { year month day }
    studios(isMain: true) { nodes { name siteUrl } }
    trailer { id site }
    siteUrl
    source
    countryOfOrigin
    rankings { rank type allTime season year context }
    relations {
      edges {
        relationType
        node { id type format status title { romaji english } coverImage { extraLarge large } }
      }
    }
    recommendations(perPage: 6) {
      nodes { mediaRecommendation { id title { romaji } coverImage { extraLarge large } averageScore type } }
    }
    mediaListEntry {
      id status score progress progressVolumes repeat notes
      startedAt { year month day }
      completedAt { year month day }
    }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    externalLinks { url site icon color }
    streamingEpisodes { title thumbnail url site }
  }
}
"""

Q_MEDIA_CHARACTERS = """
query ($id: Int, $page: Int) {
  Media(id: $id) {
    characters(page: $page, perPage: 8, sort: ROLE) {
      pageInfo { hasNextPage currentPage }
      edges {
        role
        node { id name { full native } image { large } favourites }
        voiceActors(language: JAPANESE) { id name { full } image { large } }
      }
    }
  }
}
"""

Q_MEDIA_STAFF = """
query ($id: Int, $page: Int) {
  Media(id: $id) {
    staff(page: $page, perPage: 8) {
      pageInfo { hasNextPage currentPage }
      edges {
        role
        node { id name { full native } image { large } primaryOccupations }
      }
    }
  }
}
"""

# ─── CHARACTER / STAFF ────────────────────────────────────────────────────────

Q_CHARACTER = """
query ($id: Int) {
  Character(id: $id) {
    id favourites siteUrl
    name { full native alternative }
    image { large }
    description(asHtml: false)
    gender age dateOfBirth { year month day }
    media(perPage: 6, sort: POPULARITY_DESC) {
      nodes { id type title { romaji } coverImage { extraLarge large } format averageScore }
    }
  }
}
"""

Q_STAFF = """
query ($id: Int) {
  Staff(id: $id) {
    id favourites siteUrl languageV2
    name { full native }
    image { large }
    description(asHtml: false)
    primaryOccupations gender age
    dateOfBirth { year month day }
    staffMedia(perPage: 6, sort: POPULARITY_DESC) {
      nodes { id type title { romaji } coverImage { extraLarge large } format averageScore }
    }
  }
}
"""

# ─── USER ─────────────────────────────────────────────────────────────────────

Q_VIEWER = """
query {
  Viewer {
    id name about siteUrl
    avatar { large }
    bannerImage
    statistics {
      anime { count episodesWatched minutesWatched meanScore standardDeviation }
      manga { count chaptersRead volumesRead meanScore }
    }
    favourites {
      anime(perPage: 10) { nodes { id title { romaji english } coverImage { extraLarge large } } }
      manga(perPage: 5) { nodes { id title { romaji } coverImage { extraLarge large } } }
      characters(perPage: 10) { nodes { id name { full } image { large } } }
      staff(perPage: 3) { nodes { id name { full } image { large } } }
    }
  }
}
"""

Q_USER_LIST = """
query ($userId: Int, $type: MediaType, $status: MediaListStatus) {
  MediaListCollection(userId: $userId, type: $type, status: $status) {
    lists {
      name status
      entries {
        id mediaId status score(format: POINT_10) progress progressVolumes repeat updatedAt
        notes
        startedAt { year month day }
        completedAt { year month day }
        media {
          id episodes chapters format
          title { romaji english }
          coverImage { extraLarge large }
          averageScore nextAiringEpisode { episode }
        }
      }
    }
  }
}
"""

# ─── MUTATIONS ────────────────────────────────────────────────────────────────

M_SAVE_LIST_ENTRY = """
mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int,
          $progressVolumes: Int, $repeat: Int, $notes: String,
          $startedAt: FuzzyDateInput, $completedAt: FuzzyDateInput) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score,
                     progress: $progress, progressVolumes: $progressVolumes,
                     repeat: $repeat, notes: $notes,
                     startedAt: $startedAt, completedAt: $completedAt) {
    id status score progress progressVolumes repeat notes
    startedAt { year month day }
    completedAt { year month day }
  }
}
"""

M_DELETE_LIST_ENTRY = """
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) { deleted }
}
"""

M_TOGGLE_FAVOURITE = """
mutation ($animeId: Int, $mangaId: Int, $characterId: Int, $staffId: Int) {
  ToggleFavourite(animeId: $animeId, mangaId: $mangaId,
                  characterId: $characterId, staffId: $staffId) {
    anime { nodes { id } }
  }
}
"""

# ─── BROWSE ───────────────────────────────────────────────────────────────────

Q_TRENDING = """
query ($type: MediaType, $page: Int) {
  Page(page: $page, perPage: 8) {
    pageInfo { hasNextPage currentPage }
    media(type: $type, sort: TRENDING_DESC, isAdult: false) {
      id type format status episodes chapters averageScore trending popularity
      title { romaji english }
      coverImage { large }
      genres season seasonYear
      nextAiringEpisode { episode airingAt timeUntilAiring }
    }
  }
}
"""

Q_SEASONAL = """
query ($season: MediaSeason, $seasonYear: Int, $page: Int) {
  Page(page: $page, perPage: 8) {
    pageInfo { hasNextPage currentPage }
    media(season: $season, seasonYear: $seasonYear, type: ANIME,
          sort: POPULARITY_DESC, isAdult: false) {
      id format status episodes averageScore popularity
      title { romaji english }
      coverImage { large }
      genres
      studios(isMain: true) { nodes { name } }
      nextAiringEpisode { episode airingAt timeUntilAiring }
    }
  }
}
"""

Q_AIRING_SCHEDULE = """
query ($page: Int, $notYetAired: Boolean) {
  Page(page: $page, perPage: 10) {
    pageInfo { hasNextPage currentPage }
    airingSchedules(notYetAired: $notYetAired, sort: TIME) {
      id episode airingAt timeUntilAiring
      media {
        id averageScore
        title { romaji english }
        coverImage { extraLarge large }
        mediaListEntry { status progress }
      }
    }
  }
}
"""