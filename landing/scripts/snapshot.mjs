import { writeFile } from "node:fs/promises";

const QUERY = `
query ($now: Int) {
  trending: Page(perPage: 50) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      id
      genres
      title { english romaji }
      coverImage { extraLarge color }
    }
  }
  featured: Media(id: 154587) {
    id
    episodes
    averageScore
    seasonYear
    bannerImage
    title { english romaji }
    coverImage { extraLarge color }
  }
  search: Page(perPage: 4) {
    media(search: "frieren", type: ANIME, sort: SEARCH_MATCH) {
      id
      format
      seasonYear
      averageScore
      title { english romaji }
    }
  }
  aired: Page(perPage: 50) {
    airingSchedules(airingAt_lesser: $now, sort: TIME_DESC) {
      episode
      airingAt
      media {
        id
        isAdult
        popularity
        episodes
        genres
        title { english romaji }
        coverImage { large color }
      }
    }
  }
}`;

const response = await fetch("https://graphql.anilist.co", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ query: QUERY, variables: { now: Math.floor(Date.now() / 1000) } }),
});
if (!response.ok) throw new Error(`AniList responded ${response.status}`);
const { data } = await response.json();

const title = (t) => t.english ?? t.romaji;

const safe = (m) => !m.genres.includes("Ecchi") && !m.genres.includes("Hentai");

const covers = data.trending.media
  .filter(safe)
  .slice(0, 36)
  .map((m) => ({
  id: m.id,
  title: title(m.title),
  image: m.coverImage.extraLarge,
  color: m.coverImage.color ?? "#2a2a30",
}));

const seen = new Set();
const aired = data.aired.airingSchedules
  .filter((s) => !s.media.isAdult && safe(s.media) && s.media.popularity > 8000 && !seen.has(s.media.id) && seen.add(s.media.id))
  .slice(0, 8)
  .map((s) => ({
    id: s.media.id,
    title: title(s.media.title),
    image: s.media.coverImage.large,
    color: s.media.coverImage.color ?? "#2a2a30",
    episode: s.episode,
    episodes: s.media.episodes,
  }));

const f = data.featured;
const featured = {
  id: f.id,
  title: title(f.title),
  episodes: f.episodes,
  score: f.averageScore,
  year: f.seasonYear,
  banner: f.bannerImage,
  image: f.coverImage.extraLarge,
  color: f.coverImage.color ?? "#2a2a30",
};

const search = data.search.media.map((m) => ({
  id: m.id,
  title: title(m.title),
  format: m.format,
  year: m.seasonYear,
  score: m.averageScore,
}));

await writeFile(new URL("../src/snapshot/anilist.json", import.meta.url), `${JSON.stringify({ featured, search, covers, aired }, null, 2)}\n`);
console.log(`covers ${covers.length}, aired ${aired.length}`);
