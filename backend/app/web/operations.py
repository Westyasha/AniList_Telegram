from dataclasses import dataclass

from app.anilist import queries as q


@dataclass(frozen=True, slots=True)
class Operation:
    document: str
    auth: bool = False
    mutation: bool = False
    ttl: int = 0
    personal: bool = False


OPERATIONS: dict[str, Operation] = {
    "Home": Operation(q.HOME, ttl=300),
    "Trending": Operation(q.TRENDING, ttl=300),
    "Season": Operation(q.SEASON, ttl=300),
    "Genres": Operation(q.GENRES, ttl=86400),
    "SearchMedia": Operation(q.SEARCH_MEDIA, ttl=180),
    "SearchCharacters": Operation(q.SEARCH_CHARACTERS, ttl=180),
    "SearchStaff": Operation(q.SEARCH_STAFF, ttl=180),
    "SearchUsers": Operation(q.SEARCH_USERS, ttl=180),
    "Media": Operation(q.MEDIA, ttl=300, personal=True),
    "MediaBrief": Operation(q.MEDIA_BRIEF, ttl=300, personal=True),
    "MediaCharacters": Operation(q.MEDIA_CHARACTERS, ttl=600),
    "MediaStaff": Operation(q.MEDIA_STAFF, ttl=600),
    "Character": Operation(q.CHARACTER, ttl=600, personal=True),
    "Staff": Operation(q.STAFF, ttl=600, personal=True),
    "Schedule": Operation(q.SCHEDULE, ttl=300, personal=True),
    "UserProfile": Operation(q.USER_PROFILE, ttl=120, personal=True),
    "UserActivity": Operation(q.USER_ACTIVITY, ttl=60),
    "MediaListCollection": Operation(q.MEDIA_LIST_COLLECTION, ttl=30, personal=True),
    "ViewerBrief": Operation(q.VIEWER_BRIEF, auth=True),
    "Notifications": Operation(q.NOTIFICATIONS, auth=True),
    "SaveEntry": Operation(q.SAVE_ENTRY, auth=True, mutation=True),
    "DeleteEntry": Operation(q.DELETE_ENTRY, auth=True, mutation=True),
    "ToggleFavourite": Operation(q.TOGGLE_FAVOURITE, auth=True, mutation=True),
    "ToggleFollow": Operation(q.TOGGLE_FOLLOW, auth=True, mutation=True),
    "ToggleLike": Operation(q.TOGGLE_LIKE, auth=True, mutation=True),
}
