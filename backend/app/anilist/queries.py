MEDIA_CARD = """
fragment MediaCard on Media {
  id type format status episodes chapters averageScore popularity
  season seasonYear isAdult
  title { romaji english native userPreferred }
  coverImage { extraLarge large medium color }
  bannerImage
  genres
  startDate { year month day }
  nextAiringEpisode { episode airingAt timeUntilAiring }
}
"""

LIST_ENTRY = """
fragment ListEntry on MediaList {
  id mediaId status progress progressVolumes repeat notes private
  score(format: POINT_100)
  startedAt { year month day }
  completedAt { year month day }
  updatedAt
}
"""

VIEWER_BRIEF = """
query ViewerBrief {
  Viewer {
    id name siteUrl bannerImage unreadNotificationCount
    avatar { large medium }
    options { titleLanguage profileColor displayAdultContent }
    mediaListOptions { scoreFormat }
  }
}
"""

USER_PROFILE = (
    """
query UserProfile($id: Int, $name: String) {
  User(id: $id, name: $name) {
    id name about siteUrl bannerImage createdAt isFollowing isFollower donatorTier
    avatar { large medium }
    options { profileColor }
    mediaListOptions { scoreFormat }
    statistics {
      anime {
        count meanScore standardDeviation minutesWatched episodesWatched
        statuses { status count }
        formats(sort: COUNT_DESC) { format count }
        genres(sort: COUNT_DESC, limit: 12) { genre count meanScore minutesWatched }
        scores(sort: MEAN_SCORE_DESC) { score count }
        releaseYears(sort: COUNT_DESC, limit: 15) { releaseYear count }
        studios(sort: COUNT_DESC, limit: 6) { count studio { id name } }
        voiceActors(sort: COUNT_DESC, limit: 6) { count voiceActor { id name { full } image { medium } } }
      }
      manga {
        count meanScore standardDeviation chaptersRead volumesRead
        statuses { status count }
        genres(sort: COUNT_DESC, limit: 12) { genre count meanScore chaptersRead }
      }
    }
    favourites {
      anime(perPage: 25) { nodes { ...MediaCard } }
      manga(perPage: 25) { nodes { ...MediaCard } }
      characters(perPage: 25) { nodes { id name { full userPreferred } image { large medium } } }
      staff(perPage: 25) { nodes { id name { full userPreferred } image { large medium } } }
      studios(perPage: 10) { nodes { id name } }
    }
  }
}
"""
    + MEDIA_CARD
)

USER_ACTIVITY = (
    """
query UserActivity($userId: Int, $page: Int, $perPage: Int = 20, $since: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    activities(userId: $userId, sort: ID_DESC, createdAt_greater: $since) {
      ... on ListActivity {
        id type status progress createdAt likeCount replyCount isLiked
        media { ...MediaCard }
      }
      ... on TextActivity {
        id type text(asHtml: false) createdAt likeCount replyCount isLiked
      }
    }
  }
}
"""
    + MEDIA_CARD
)

HOME = (
    """
query Home($season: MediaSeason, $seasonYear: Int, $nextSeason: MediaSeason, $nextYear: Int, $airingFrom: Int, $airingTo: Int) {
  trending: Page(perPage: 12) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ...MediaCard description(asHtml: false) trending }
  }
  season: Page(perPage: 12) {
    media(season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ...MediaCard }
  }
  nextSeason: Page(perPage: 12) {
    media(season: $nextSeason, seasonYear: $nextYear, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ...MediaCard }
  }
  popular: Page(perPage: 12) {
    media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ...MediaCard }
  }
  manga: Page(perPage: 12) {
    media(sort: TRENDING_DESC, type: MANGA, isAdult: false) { ...MediaCard }
  }
  airing: Page(perPage: 25) {
    airingSchedules(airingAt_greater: $airingFrom, airingAt_lesser: $airingTo, sort: TIME) {
      id episode airingAt timeUntilAiring
      media { ...MediaCard }
    }
  }
}
"""
    + MEDIA_CARD
)

SEARCH_MEDIA = (
    """
query SearchMedia(
  $page: Int = 1, $perPage: Int = 20, $search: String, $type: MediaType,
  $sort: [MediaSort] = [POPULARITY_DESC], $genres: [String], $tags: [String],
  $formats: [MediaFormat], $status: MediaStatus, $season: MediaSeason,
  $seasonYear: Int, $year: String, $minScore: Int, $isAdult: Boolean = false
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(
      search: $search, type: $type, sort: $sort, genre_in: $genres, tag_in: $tags,
      format_in: $formats, status: $status, season: $season, seasonYear: $seasonYear,
      startDate_like: $year, averageScore_greater: $minScore, isAdult: $isAdult
    ) { ...MediaCard }
  }
}
"""
    + MEDIA_CARD
)

SEARCH_CHARACTERS = """
query SearchCharacters($page: Int = 1, $perPage: Int = 20, $search: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
      id favourites
      name { full native userPreferred }
      image { large medium }
      media(perPage: 2, sort: POPULARITY_DESC) { nodes { id type title { userPreferred romaji english } } }
    }
  }
}
"""

SEARCH_STAFF = """
query SearchStaff($page: Int = 1, $perPage: Int = 20, $search: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    staff(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
      id favourites primaryOccupations
      name { full native userPreferred }
      image { large medium }
    }
  }
}
"""

SEARCH_USERS = """
query SearchUsers($page: Int = 1, $perPage: Int = 20, $search: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    users(search: $search, sort: SEARCH_MATCH) {
      id name bannerImage
      avatar { large medium }
    }
  }
}
"""

MEDIA = (
    """
query Media($id: Int) {
  Media(id: $id) {
    ...MediaCard
    description(asHtml: false)
    duration volumes source hashtag countryOfOrigin isLicensed
    favourites isFavourite meanScore trending synonyms siteUrl
    endDate { year month day }
    trailer { id site thumbnail }
    studios { edges { isMain node { id name isAnimationStudio } } }
    tags { id name rank isMediaSpoiler isGeneralSpoiler category }
    rankings { id rank type allTime season year context }
    stats {
      scoreDistribution { score amount }
      statusDistribution { status amount }
    }
    externalLinks { id url site type language color icon }
    streamingEpisodes { title thumbnail url site }
    relations {
      edges { id relationType(version: 2) node { ...MediaCard } }
    }
    characters(perPage: 12, sort: [ROLE, RELEVANCE, ID]) {
      edges {
        role
        node { id name { full userPreferred } image { large medium } }
        voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { id name { full userPreferred } image { large medium } }
      }
    }
    staff(perPage: 10, sort: [RELEVANCE, ID]) {
      edges { role node { id name { full userPreferred } image { large medium } } }
    }
    recommendations(perPage: 12, sort: [RATING_DESC, ID]) {
      nodes { id rating mediaRecommendation { ...MediaCard } }
    }
    mediaListEntry { ...ListEntry }
  }
}
"""
    + MEDIA_CARD
    + LIST_ENTRY
)

MEDIA_CHARACTERS = """
query MediaCharacters($id: Int, $page: Int = 1, $perPage: Int = 25) {
  Media(id: $id) {
    id
    characters(page: $page, perPage: $perPage, sort: [ROLE, RELEVANCE, ID]) {
      pageInfo { hasNextPage currentPage lastPage }
      edges {
        role
        node { id favourites name { full userPreferred } image { large medium } }
        voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { id name { full userPreferred } image { large medium } }
      }
    }
  }
}
"""

MEDIA_STAFF = """
query MediaStaff($id: Int, $page: Int = 1, $perPage: Int = 25) {
  Media(id: $id) {
    id
    staff(page: $page, perPage: $perPage, sort: [RELEVANCE, ID]) {
      pageInfo { hasNextPage currentPage lastPage }
      edges { role node { id favourites primaryOccupations name { full userPreferred } image { large medium } } }
    }
  }
}
"""

MEDIA_BRIEF = (
    """
query MediaBrief($id: Int) {
  Media(id: $id) {
    ...MediaCard
    isFavourite
    mediaListEntry { ...ListEntry }
  }
}
"""
    + MEDIA_CARD
    + LIST_ENTRY
)

CHARACTER = (
    """
query Character($id: Int, $page: Int = 1) {
  Character(id: $id) {
    id favourites isFavourite siteUrl age gender bloodType
    name { full native userPreferred alternative alternativeSpoiler }
    image { large medium }
    description(asHtml: false)
    dateOfBirth { year month day }
    media(page: $page, perPage: 25, sort: [POPULARITY_DESC]) {
      pageInfo { hasNextPage }
      edges {
        characterRole
        node { ...MediaCard }
        voiceActors(language: JAPANESE) { id name { full userPreferred } image { large medium } }
      }
    }
  }
}
"""
    + MEDIA_CARD
)

STAFF = (
    """
query Staff($id: Int, $page: Int = 1) {
  Staff(id: $id) {
    id favourites isFavourite siteUrl age gender languageV2 primaryOccupations
    yearsActive homeTown bloodType
    name { full native userPreferred alternative }
    image { large medium }
    description(asHtml: false)
    dateOfBirth { year month day }
    dateOfDeath { year month day }
    characters(page: 1, perPage: 12, sort: [FAVOURITES_DESC]) {
      nodes { id name { full userPreferred } image { large medium } }
    }
    staffMedia(page: $page, perPage: 25, sort: [POPULARITY_DESC]) {
      pageInfo { hasNextPage }
      edges { staffRole node { ...MediaCard } }
    }
  }
}
"""
    + MEDIA_CARD
)

TRENDING = (
    """
query Trending($type: MediaType, $page: Int = 1, $perPage: Int = 10) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage lastPage }
    media(type: $type, sort: TRENDING_DESC, isAdult: false) { ...MediaCard trending }
  }
}
"""
    + MEDIA_CARD
)

SEASON = (
    """
query Season($season: MediaSeason, $seasonYear: Int, $page: Int = 1, $perPage: Int = 10, $sort: [MediaSort] = [POPULARITY_DESC]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage lastPage total }
    media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: $sort, isAdult: false) {
      ...MediaCard
      studios(isMain: true) { nodes { id name } }
    }
  }
}
"""
    + MEDIA_CARD
)

SCHEDULE = (
    """
query Schedule($from: Int, $to: Int, $page: Int = 1, $perPage: Int = 50) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage }
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
      id episode airingAt timeUntilAiring
      media {
        ...MediaCard
        mediaListEntry { id status progress }
      }
    }
  }
}
"""
    + MEDIA_CARD
)

GENRES = """
query Genres {
  genres: GenreCollection
  tags: MediaTagCollection { id name category isAdult }
}
"""

MEDIA_LIST_COLLECTION = (
    """
query MediaListCollection($userId: Int, $type: MediaType, $status: MediaListStatus) {
  MediaListCollection(userId: $userId, type: $type, status: $status, sort: [UPDATED_TIME_DESC]) {
    hasNextChunk
    lists {
      name status isCustomList
      entries {
        ...ListEntry
        media { ...MediaCard volumes }
      }
    }
  }
}
"""
    + MEDIA_CARD
    + LIST_ENTRY
)

LIST_ENTRIES_FOR_MEDIA = """
query ListEntriesForMedia($userId: Int, $mediaIds: [Int], $statuses: [MediaListStatus], $page: Int = 1) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    mediaList(userId: $userId, mediaId_in: $mediaIds, status_in: $statuses) {
      mediaId status progress
    }
  }
}
"""

NOTIFICATIONS = (
    """
query Notifications($page: Int = 1, $perPage: Int = 25, $types: [NotificationType], $reset: Boolean = false) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    notifications(type_in: $types, resetNotificationCount: $reset) {
      ... on AiringNotification { id type createdAt episode contexts media { ...MediaCard } }
      ... on RelatedMediaAdditionNotification { id type createdAt context media { ...MediaCard } }
      ... on MediaDataChangeNotification { id type createdAt context reason media { ...MediaCard } }
      ... on FollowingNotification { id type createdAt context user { id name avatar { medium } } }
      ... on ActivityLikeNotification { id type createdAt context activityId user { id name avatar { medium } } }
      ... on ActivityReplyNotification { id type createdAt context activityId user { id name avatar { medium } } }
      ... on ActivityMessageNotification { id type createdAt context activityId user { id name avatar { medium } } }
      ... on ActivityMentionNotification { id type createdAt context activityId user { id name avatar { medium } } }
      ... on ActivityReplyLikeNotification { id type createdAt context activityId user { id name avatar { medium } } }
    }
  }
}
"""
    + MEDIA_CARD
)

NEW_RELEASES = (
    """
query NewReleases($from: FuzzyDateInt, $to: FuzzyDateInt, $page: Int = 1) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(startDate_greater: $from, startDate_lesser: $to, sort: START_DATE_DESC, isAdult: false) {
      ...MediaCard
      relations { edges { relationType(version: 2) node { id } } }
    }
  }
}
"""
    + MEDIA_CARD
)

CARD_USER = """
query CardUser($id: Int, $name: String) {
  User(id: $id, name: $name) {
    id name siteUrl bannerImage
    avatar { large }
    statistics {
      anime {
        count meanScore minutesWatched episodesWatched
        genres(sort: COUNT_DESC, limit: 8) { genre count }
        statuses { status count }
      }
      manga { count meanScore chaptersRead volumesRead }
    }
    favourites {
      anime(perPage: 11) { pageInfo { total } nodes { id title { userPreferred romaji english } coverImage { extraLarge large } } }
      characters(perPage: 11) { pageInfo { total } nodes { id name { full } image { large } } }
    }
  }
}
"""

WRAPPED_ACTIVITY = """
query WrappedActivity($userId: Int, $from: Int, $to: Int, $page: Int = 1) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    activities(userId: $userId, type: ANIME_LIST, createdAt_greater: $from, createdAt_lesser: $to, sort: ID_DESC) {
      ... on ListActivity {
        createdAt status progress
        media { id episodes duration genres title { userPreferred romaji english } coverImage { extraLarge large } }
      }
    }
  }
}
"""

SAVE_ENTRY = (
    """
mutation SaveEntry(
  $id: Int, $mediaId: Int, $status: MediaListStatus, $scoreRaw: Int, $progress: Int,
  $progressVolumes: Int, $repeat: Int, $notes: String, $private: Boolean,
  $startedAt: FuzzyDateInput, $completedAt: FuzzyDateInput
) {
  SaveMediaListEntry(
    id: $id, mediaId: $mediaId, status: $status, scoreRaw: $scoreRaw, progress: $progress,
    progressVolumes: $progressVolumes, repeat: $repeat, notes: $notes, private: $private,
    startedAt: $startedAt, completedAt: $completedAt
  ) { ...ListEntry }
}
"""
    + LIST_ENTRY
)

DELETE_ENTRY = """
mutation DeleteEntry($id: Int) {
  DeleteMediaListEntry(id: $id) { deleted }
}
"""

TOGGLE_FAVOURITE = """
mutation ToggleFavourite($animeId: Int, $mangaId: Int, $characterId: Int, $staffId: Int, $studioId: Int) {
  ToggleFavourite(animeId: $animeId, mangaId: $mangaId, characterId: $characterId, staffId: $staffId, studioId: $studioId) {
    anime(perPage: 1) { pageInfo { total } }
  }
}
"""

TOGGLE_FOLLOW = """
mutation ToggleFollow($userId: Int) {
  ToggleFollow(userId: $userId) { id isFollowing }
}
"""

TOGGLE_LIKE = """
mutation ToggleLike($id: Int, $type: LikeableType) {
  ToggleLikeV2(id: $id, type: $type) { __typename }
}
"""
