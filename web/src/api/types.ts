import type { Appearance } from "@/lib/appearance";
export type Lang = "ru" | "en";

export type ScoreFormat = "POINT_100" | "POINT_10_DECIMAL" | "POINT_10" | "POINT_5" | "POINT_3";

export type TitleLanguage =
  | "ROMAJI"
  | "ENGLISH"
  | "NATIVE"
  | "ROMAJI_STYLISED"
  | "ENGLISH_STYLISED"
  | "NATIVE_STYLISED";

export type MediaType = "ANIME" | "MANGA";

export type MediaFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC"
  | "MANGA"
  | "NOVEL"
  | "ONE_SHOT";

export type MediaStatus = "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";

export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export type MediaListStatus = "CURRENT" | "PLANNING" | "COMPLETED" | "DROPPED" | "PAUSED" | "REPEATING";

export type MediaSource =
  | "ORIGINAL"
  | "MANGA"
  | "LIGHT_NOVEL"
  | "VISUAL_NOVEL"
  | "VIDEO_GAME"
  | "OTHER"
  | "NOVEL"
  | "DOUJINSHI"
  | "ANIME"
  | "WEB_NOVEL"
  | "LIVE_ACTION"
  | "GAME"
  | "COMIC"
  | "MULTIMEDIA_PROJECT"
  | "PICTURE_BOOK";

export type MediaRelation =
  | "ADAPTATION"
  | "PREQUEL"
  | "SEQUEL"
  | "PARENT"
  | "SIDE_STORY"
  | "CHARACTER"
  | "SUMMARY"
  | "ALTERNATIVE"
  | "SPIN_OFF"
  | "OTHER"
  | "SOURCE"
  | "COMPILATION"
  | "CONTAINS";

export type MediaSort =
  | "SEARCH_MATCH"
  | "POPULARITY_DESC"
  | "SCORE_DESC"
  | "TRENDING_DESC"
  | "START_DATE_DESC"
  | "FAVOURITES_DESC"
  | "TITLE_ROMAJI"
  | "UPDATED_AT_DESC";

export type CharacterRole = "MAIN" | "SUPPORTING" | "BACKGROUND";

export type ExternalLinkType = "INFO" | "STREAMING" | "SOCIAL";

export type LikeableType = "THREAD" | "THREAD_COMMENT" | "ACTIVITY" | "ACTIVITY_REPLY";

export interface FuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface MediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
  userPreferred: string | null;
}

export interface CoverImage {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
}

export interface ImageSet {
  large: string | null;
  medium: string | null;
}

export interface PersonName {
  full: string | null;
  userPreferred: string | null;
}

export interface FullPersonName extends PersonName {
  native: string | null;
  alternative: string[] | null;
}

export interface NextAiringEpisode {
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
}

export interface PageInfo {
  hasNextPage: boolean;
  total?: number;
  currentPage?: number;
  lastPage?: number;
}

export interface MediaCard {
  id: number;
  type: MediaType;
  format: MediaFormat | null;
  status: MediaStatus | null;
  episodes: number | null;
  chapters: number | null;
  averageScore: number | null;
  popularity: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  isAdult: boolean;
  title: MediaTitle;
  coverImage: CoverImage;
  bannerImage: string | null;
  genres: string[];
  startDate: FuzzyDate;
  nextAiringEpisode: NextAiringEpisode | null;
}

export interface ListEntry {
  id: number;
  mediaId: number;
  status: MediaListStatus | null;
  progress: number | null;
  progressVolumes: number | null;
  repeat: number | null;
  notes: string | null;
  private: boolean | null;
  score: number | null;
  startedAt: FuzzyDate;
  completedAt: FuzzyDate;
  updatedAt: number | null;
}

export interface SessionUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface SessionAniList {
  id: number;
  name: string;
  avatar: string | null;
  banner: string | null;
  score_format: ScoreFormat;
  title_language: TitleLanguage;
  profile_color: string | null;
  unread_notifications: number;
}

export interface NotificationSettings {
  enabled: boolean;
  airing_watching: boolean;
  airing_planning: boolean;
  airing_paused: boolean;
  airing_dropped: boolean;
  related: boolean;
  anilist_activity: boolean;
}

export interface Session {
  user: SessionUser | null;
  lang: Lang;
  bot_username: string;
  anilist: SessionAniList | null;
  notifications: NotificationSettings;
  appearance?: Appearance;
}

export interface SettingsPayload {
  lang?: Lang;
  notifications?: Partial<NotificationSettings>;
  appearance?: Appearance;
}

export interface AuthLinkResponse {
  url: string;
  mode?: "bot" | "oauth";
}

export interface TrendingMedia extends MediaCard {
  description: string | null;
  trending: number | null;
}

export interface AiringSchedule {
  id: number;
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
  media: MediaCard;
}

export interface HomeVariables {
  season: MediaSeason;
  seasonYear: number;
  nextSeason: MediaSeason;
  nextYear: number;
  airingFrom: number;
  airingTo: number;
}

export interface HomeData {
  trending: { media: TrendingMedia[] };
  season: { media: MediaCard[] };
  nextSeason: { media: MediaCard[] };
  popular: { media: MediaCard[] };
  manga: { media: MediaCard[] };
  airing: { airingSchedules: AiringSchedule[] };
}

export interface TrendingVariables {
  type?: MediaType;
  page?: number;
  perPage?: number;
}

export interface TrendingData {
  Page: { pageInfo: PageInfo; media: TrendingMedia[] };
}

export interface SeasonVariables {
  season: MediaSeason;
  seasonYear: number;
  page?: number;
  perPage?: number;
  sort?: MediaSort[];
}

export interface SeasonMedia extends MediaCard {
  studios: { nodes: { id: number; name: string }[] };
}

export interface SeasonData {
  Page: { pageInfo: PageInfo; media: SeasonMedia[] };
}

export interface MediaTagInfo {
  id: number;
  name: string;
  category: string | null;
  isAdult: boolean;
}

export interface GenresData {
  genres: string[];
  tags: MediaTagInfo[];
}

export interface SearchMediaVariables {
  page?: number;
  perPage?: number;
  search?: string;
  type?: MediaType;
  sort?: MediaSort[];
  genres?: string[];
  tags?: string[];
  formats?: MediaFormat[];
  status?: MediaStatus;
  season?: MediaSeason;
  seasonYear?: number;
  year?: string;
  minScore?: number;
  isAdult?: boolean;
}

export interface SearchMediaData {
  Page: { pageInfo: PageInfo; media: MediaCard[] };
}

export interface SearchPageVariables {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface CharacterSearchResult {
  id: number;
  favourites: number | null;
  name: PersonName & { native: string | null };
  image: ImageSet;
  media: { nodes: { id: number; type: MediaType; title: Pick<MediaTitle, "userPreferred" | "romaji" | "english"> }[] };
}

export interface SearchCharactersData {
  Page: { pageInfo: PageInfo; characters: CharacterSearchResult[] };
}

export interface StaffSearchResult {
  id: number;
  favourites: number | null;
  primaryOccupations: string[];
  name: PersonName & { native: string | null };
  image: ImageSet;
}

export interface SearchStaffData {
  Page: { pageInfo: PageInfo; staff: StaffSearchResult[] };
}

export interface UserSearchResult {
  id: number;
  name: string;
  bannerImage: string | null;
  avatar: ImageSet;
}

export interface SearchUsersData {
  Page: { pageInfo: PageInfo; users: UserSearchResult[] };
}

export interface PersonRef {
  id: number;
  name: PersonName;
  image: ImageSet;
}

export interface MediaTag {
  id: number;
  name: string;
  rank: number | null;
  isMediaSpoiler: boolean;
  isGeneralSpoiler: boolean;
  category: string | null;
}

export interface MediaRank {
  id: number;
  rank: number;
  type: "RATED" | "POPULAR";
  allTime: boolean | null;
  season: MediaSeason | null;
  year: number | null;
  context: string;
}

export interface ExternalLink {
  id: number;
  url: string;
  site: string;
  type: ExternalLinkType | null;
  language: string | null;
  color: string | null;
  icon: string | null;
}

export interface StreamingEpisode {
  title: string | null;
  thumbnail: string | null;
  url: string | null;
  site: string | null;
}

export interface CharacterEdge {
  role: CharacterRole | null;
  node: PersonRef & { favourites?: number | null };
  voiceActors: PersonRef[];
}

export interface StaffEdge {
  role: string | null;
  node: PersonRef & { favourites?: number | null; primaryOccupations?: string[] };
}

export interface MediaDetails extends MediaCard {
  description: string | null;
  duration: number | null;
  volumes: number | null;
  source: MediaSource | null;
  hashtag: string | null;
  countryOfOrigin: string | null;
  isLicensed: boolean | null;
  favourites: number | null;
  isFavourite: boolean;
  meanScore: number | null;
  trending: number | null;
  synonyms: string[];
  siteUrl: string | null;
  endDate: FuzzyDate;
  trailer: { id: string; site: string; thumbnail: string | null } | null;
  studios: { edges: { isMain: boolean; node: { id: number; name: string; isAnimationStudio: boolean } }[] };
  tags: MediaTag[];
  rankings: MediaRank[];
  stats: {
    scoreDistribution: { score: number; amount: number }[] | null;
    statusDistribution: { status: MediaListStatus; amount: number }[] | null;
  } | null;
  externalLinks: ExternalLink[];
  streamingEpisodes: StreamingEpisode[];
  relations: { edges: { id: number; relationType: MediaRelation | null; node: MediaCard }[] };
  characters: { edges: CharacterEdge[] };
  staff: { edges: StaffEdge[] };
  recommendations: { nodes: { id: number; rating: number | null; mediaRecommendation: MediaCard | null }[] };
  mediaListEntry: ListEntry | null;
}

export interface MediaData {
  Media: MediaDetails;
}

export interface MediaBriefData {
  Media: MediaCard & { isFavourite: boolean; mediaListEntry: ListEntry | null };
}

export interface MediaPageVariables {
  id: number;
  page?: number;
  perPage?: number;
}

export interface MediaCharactersData {
  Media: { id: number; characters: { pageInfo: PageInfo; edges: CharacterEdge[] } };
}

export interface MediaStaffData {
  Media: { id: number; staff: { pageInfo: PageInfo; edges: StaffEdge[] } };
}

export interface CharacterDetails {
  id: number;
  favourites: number | null;
  isFavourite: boolean;
  siteUrl: string | null;
  age: string | null;
  gender: string | null;
  bloodType: string | null;
  name: FullPersonName & { alternativeSpoiler: string[] | null };
  image: ImageSet;
  description: string | null;
  dateOfBirth: FuzzyDate;
  media: {
    pageInfo: PageInfo;
    edges: { characterRole: CharacterRole | null; node: MediaCard; voiceActors: PersonRef[] }[];
  };
}

export interface CharacterData {
  Character: CharacterDetails;
}

export interface StaffDetails {
  id: number;
  favourites: number | null;
  isFavourite: boolean;
  siteUrl: string | null;
  age: number | null;
  gender: string | null;
  languageV2: string | null;
  primaryOccupations: string[];
  yearsActive: number[];
  homeTown: string | null;
  bloodType: string | null;
  name: FullPersonName;
  image: ImageSet;
  description: string | null;
  dateOfBirth: FuzzyDate;
  dateOfDeath: FuzzyDate;
  characters: { nodes: PersonRef[] };
  staffMedia: { pageInfo: PageInfo; edges: { staffRole: string | null; node: MediaCard }[] };
}

export interface StaffData {
  Staff: StaffDetails;
}

export interface ScheduleVariables {
  from: number;
  to: number;
  page?: number;
  perPage?: number;
}

export interface ScheduleEntry {
  id: number;
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
  media: MediaCard & { mediaListEntry: { id: number; status: MediaListStatus | null; progress: number | null } | null };
}

export interface ScheduleData {
  Page: { pageInfo: PageInfo; airingSchedules: ScheduleEntry[] };
}

export interface UserStatusStat {
  status: MediaListStatus;
  count: number;
}

export interface AnimeStatistics {
  count: number;
  meanScore: number;
  standardDeviation: number;
  minutesWatched: number;
  episodesWatched: number;
  statuses: UserStatusStat[];
  formats: { format: MediaFormat; count: number }[];
  genres: { genre: string; count: number; meanScore: number; minutesWatched: number }[];
  scores: { score: number; count: number }[];
  releaseYears: { releaseYear: number; count: number }[];
  studios: { count: number; studio: { id: number; name: string } }[];
  voiceActors: { count: number; voiceActor: { id: number; name: { full: string | null }; image: { medium: string | null } } }[];
}

export interface MangaStatistics {
  count: number;
  meanScore: number;
  standardDeviation: number;
  chaptersRead: number;
  volumesRead: number;
  statuses: UserStatusStat[];
  genres: { genre: string; count: number; meanScore: number; chaptersRead: number }[];
}

export interface UserProfile {
  id: number;
  name: string;
  about: string | null;
  siteUrl: string;
  bannerImage: string | null;
  createdAt: number | null;
  isFollowing: boolean | null;
  isFollower: boolean | null;
  donatorTier: number | null;
  avatar: ImageSet;
  options: { profileColor: string | null } | null;
  mediaListOptions: { scoreFormat: ScoreFormat | null } | null;
  statistics: { anime: AnimeStatistics; manga: MangaStatistics };
  favourites: {
    anime: { nodes: MediaCard[] };
    manga: { nodes: MediaCard[] };
    characters: { nodes: PersonRef[] };
    staff: { nodes: PersonRef[] };
    studios: { nodes: { id: number; name: string }[] };
  };
}

export interface UserProfileVariables {
  id?: number;
  name?: string;
}

export interface UserProfileData {
  User: UserProfile;
}

export interface ListActivity {
  id: number;
  type: "ANIME_LIST" | "MANGA_LIST";
  status: string | null;
  progress: string | null;
  createdAt: number;
  likeCount: number;
  replyCount: number;
  isLiked: boolean | null;
  media: MediaCard | null;
}

export interface TextActivity {
  id: number;
  type: "TEXT";
  text: string | null;
  createdAt: number;
  likeCount: number;
  replyCount: number;
  isLiked: boolean | null;
}

export type Activity = ListActivity | TextActivity;

export interface UnknownNode {
  id?: undefined;
}

export function isKnownNode<T extends { id: number }>(item: T | UnknownNode): item is T {
  return typeof item.id === "number";
}

export interface UserActivityVariables {
  userId: number;
  page?: number;
  perPage?: number;
  since?: number;
}

export interface UserActivityData {
  Page: { pageInfo: PageInfo; activities: (Activity | UnknownNode)[] };
}

export interface CollectionMedia extends MediaCard {
  volumes: number | null;
}

export interface CollectionEntry extends ListEntry {
  media: CollectionMedia;
}

export interface MediaListGroup {
  name: string;
  status: MediaListStatus | null;
  isCustomList: boolean;
  entries: CollectionEntry[];
}

export interface MediaListCollectionVariables {
  userId: number;
  type: MediaType;
  status?: MediaListStatus;
}

export interface MediaListCollectionData {
  MediaListCollection: { hasNextChunk: boolean; lists: MediaListGroup[] } | null;
}

export interface ViewerBriefData {
  Viewer: {
    id: number;
    name: string;
    siteUrl: string;
    bannerImage: string | null;
    unreadNotificationCount: number;
    avatar: ImageSet;
    options: { titleLanguage: TitleLanguage; profileColor: string | null; displayAdultContent: boolean };
    mediaListOptions: { scoreFormat: ScoreFormat };
  };
}

export interface NotificationUser {
  id: number;
  name: string;
  avatar: { medium: string | null };
}

interface NotificationBase {
  id: number;
  createdAt: number;
}

export interface AiringNotification extends NotificationBase {
  type: "AIRING";
  episode: number;
  contexts: string[];
  media: MediaCard;
}

export interface MediaNotification extends NotificationBase {
  type: "RELATED_MEDIA_ADDITION" | "MEDIA_DATA_CHANGE";
  context: string | null;
  reason?: string | null;
  media: MediaCard;
}

export interface UserNotification extends NotificationBase {
  type:
    | "FOLLOWING"
    | "ACTIVITY_LIKE"
    | "ACTIVITY_REPLY"
    | "ACTIVITY_MESSAGE"
    | "ACTIVITY_MENTION"
    | "ACTIVITY_REPLY_LIKE";
  context: string | null;
  activityId?: number;
  user: NotificationUser | null;
}

export type AppNotification = AiringNotification | MediaNotification | UserNotification;

export interface NotificationsVariables {
  page?: number;
  perPage?: number;
  types?: string[];
  reset?: boolean;
}

export interface NotificationsData {
  Page: { pageInfo: PageInfo; notifications: (AppNotification | UnknownNode)[] };
}

export interface SaveEntryVariables {
  id?: number;
  mediaId: number;
  status?: MediaListStatus;
  scoreRaw?: number;
  progress?: number;
  progressVolumes?: number;
  repeat?: number;
  notes?: string;
  private?: boolean;
  startedAt?: FuzzyDate;
  completedAt?: FuzzyDate;
}

export interface SaveEntryData {
  SaveMediaListEntry: ListEntry;
}

export interface DeleteEntryData {
  DeleteMediaListEntry: { deleted: boolean };
}

export interface ToggleFavouriteVariables {
  animeId?: number;
  mangaId?: number;
  characterId?: number;
  staffId?: number;
  studioId?: number;
}

export interface ToggleFavouriteData {
  ToggleFavourite: { anime: { pageInfo: { total: number } } | null };
}

export interface ToggleFollowData {
  ToggleFollow: { id: number; isFollowing: boolean };
}

export interface ToggleLikeData {
  ToggleLikeV2: { __typename: string };
}

export interface OperationMap {
  Home: { variables: HomeVariables; data: HomeData };
  Trending: { variables: TrendingVariables; data: TrendingData };
  Season: { variables: SeasonVariables; data: SeasonData };
  Genres: { variables: Record<string, never>; data: GenresData };
  SearchMedia: { variables: SearchMediaVariables; data: SearchMediaData };
  SearchCharacters: { variables: SearchPageVariables; data: SearchCharactersData };
  SearchStaff: { variables: SearchPageVariables; data: SearchStaffData };
  SearchUsers: { variables: SearchPageVariables; data: SearchUsersData };
  Media: { variables: { id: number }; data: MediaData };
  MediaBrief: { variables: { id: number }; data: MediaBriefData };
  MediaCharacters: { variables: MediaPageVariables; data: MediaCharactersData };
  MediaStaff: { variables: MediaPageVariables; data: MediaStaffData };
  Character: { variables: { id: number; page?: number }; data: CharacterData };
  Staff: { variables: { id: number; page?: number }; data: StaffData };
  Schedule: { variables: ScheduleVariables; data: ScheduleData };
  UserProfile: { variables: UserProfileVariables; data: UserProfileData };
  UserActivity: { variables: UserActivityVariables; data: UserActivityData };
  MediaListCollection: { variables: MediaListCollectionVariables; data: MediaListCollectionData };
  ViewerBrief: { variables: Record<string, never>; data: ViewerBriefData };
  Notifications: { variables: NotificationsVariables; data: NotificationsData };
  SaveEntry: { variables: SaveEntryVariables; data: SaveEntryData };
  DeleteEntry: { variables: { id: number }; data: DeleteEntryData };
  ToggleFavourite: { variables: ToggleFavouriteVariables; data: ToggleFavouriteData };
  ToggleFollow: { variables: { userId: number }; data: ToggleFollowData };
  ToggleLike: { variables: { id: number; type: LikeableType }; data: ToggleLikeData };
}

export type OperationName = keyof OperationMap;
export type OpVariables<K extends OperationName> = OperationMap[K]["variables"];
export type OpData<K extends OperationName> = OperationMap[K]["data"];
