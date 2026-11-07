import snapshot from "@/data/anilist.json";

export const BOT_URL = "https://t.me/westyasha_AniList_bot";
export const BOT_HANDLE = "@westyasha_AniList_bot";
export const GITHUB_URL = "https://github.com/Westyasha/AniList_Telegram";
export const SITE_URL = "https://westyasha.github.io/AniList_Telegram";

export type Locale = "en" | "ru";

export interface Cover {
  id: number;
  title: string;
  image: string;
  color: string;
}

export interface Aired extends Cover {
  episode: number;
  episodes: number | null;
}

export interface Featured extends Cover {
  episodes: number;
  score: number;
  year: number;
  banner: string;
}

export interface SearchHit {
  id: number;
  title: string;
  format: string;
  year: number | null;
  score: number | null;
}

export const featured = snapshot.featured as Featured;
export const covers = snapshot.covers as Cover[];
export const aired = snapshot.aired as Aired[];
export const searchHits = snapshot.search as SearchHit[];
