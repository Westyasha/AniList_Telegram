"use client";

import { Heart, Share2 } from "lucide-react";
import type { MediaDetails, MediaRank } from "@/api/types";
import { useAuthGuard } from "@/api/auth";
import { useToggleFavourite } from "@/api/mutations";
import { useSession, useTitle } from "@/api/session";
import { useT, type Dict } from "@/lib/i18n";
import { formatCompact, formatCountdown } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { airedUnits, coverOf, mediaMeta, totalUnits } from "@/lib/media";
import { scoreTone } from "@/lib/score";
import { statusLabel } from "@/lib/status";
import { shareInline } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { Banner } from "@/components/media/Banner";
import { Poster } from "@/components/media/Poster";
import { StatusDot, UserScore } from "@/components/media/Marks";
import { ProgressTrack } from "@/components/media/ProgressTrack";
import { openListEditor } from "@/components/media/ListEditor";
import { FloatingBack } from "@/components/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";

function rankText(rank: MediaRank, t: Dict): string {
  const kind = rank.type === "RATED" ? t.media.rankRated : t.media.rankPopular;
  if (rank.allTime) return `#${rank.rank} ${kind} ${t.media.allTime}`;
  if (rank.season && rank.year) return `#${rank.rank} ${kind}, ${t.enums.season[rank.season].toLowerCase()} ${rank.year}`;
  if (rank.year) return `#${rank.rank} ${kind}, ${rank.year}`;
  return `#${rank.rank} ${kind}`;
}

function topRanks(ranks: MediaRank[]): MediaRank[] {
  const pick = (type: MediaRank["type"]) =>
    ranks.find((rank) => rank.type === type && rank.allTime) ?? ranks.find((rank) => rank.type === type && rank.year && !rank.season) ?? ranks.find((rank) => rank.type === type);
  return [pick("RATED"), pick("POPULAR")].filter((rank): rank is MediaRank => Boolean(rank));
}

async function share(title: string, url: string | null, copied: string): Promise<void> {
  if (shareInline(title)) return;
  const target = url ?? window.location.href;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: target });
    } catch {
      return;
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(target);
    toast.success(copied);
  } catch {
    return;
  }
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-l border-line pl-4 first:border-l-0 first:pl-0">
      <dt className="truncate text-12 text-fg3">{label}</dt>
      <dd className="figure text-20 text-fg" style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  );
}

export function MediaHeader({ media }: { media: MediaDetails }) {
  const t = useT();
  const session = useSession();
  const title = useTitle()(media.title);
  const guard = useAuthGuard();
  const favourite = useToggleFavourite();
  const now = useNow(30_000);
  const entry = media.mediaListEntry;
  const total = totalUnits(media);
  const aired = airedUnits(media);
  const ranks = topRanks(media.rankings ?? []);
  const subtitle = media.title.native && media.title.native !== title ? media.title.native : media.title.romaji && media.title.romaji !== title ? media.title.romaji : null;
  const next = media.nextAiringEpisode;
  const isAnime = media.type === "ANIME";

  const openEditor = guard(() => openListEditor({ media, entry }));
  const toggleFavourite = guard(() => favourite.mutate({ kind: isAnime ? "anime" : "manga", id: media.id }));

  return (
    <div>
      <div className="relative">
        <FloatingBack />
        <Banner src={media.bannerImage ?? coverOf(media)} dim={!media.bannerImage} height={176} preload />
      </div>
      <div className="relative z-10 -mt-24 flex items-end gap-4 px-4">
        <Poster src={coverOf(media)} alt={title} sizes="112px" preload className="w-28 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 pb-0.5">
          <h1 className="line-clamp-3 text-20 font-semibold text-fg">{title}</h1>
          {subtitle ? <p className="truncate text-13 text-fg2">{subtitle}</p> : null}
          <p className="text-13 text-fg3">{[mediaMeta(media, t), media.status ? t.enums.status[media.status] : null].filter(Boolean).join(", ")}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 px-4">
        {entry?.status ? (
          <Button variant="secondary" className="flex-1 justify-start" onClick={openEditor}>
            <span className="flex min-w-0 items-center gap-2">
              <StatusDot status={entry.status} />
              <span className="truncate">{statusLabel(t, media.type, entry.status)}</span>
              {session.anilist && (entry.score ?? 0) > 0 ? <UserScore raw={entry.score} format={session.anilist.score_format} className="text-13" /> : null}
            </span>
          </Button>
        ) : (
          <Button variant="primary" className="flex-1" onClick={openEditor}>
            {t.media.addToList}
          </Button>
        )}
        <IconButton
          icon={Heart}
          label={media.isFavourite ? t.media.unfavourite : t.media.favourite}
          pressedState={media.isFavourite}
          filled={media.isFavourite}
          outline
          onClick={toggleFavourite}
          className={media.isFavourite ? "text-accent-ink hover:text-accent-ink" : undefined}
        />
        <IconButton icon={Share2} label={t.media.share} outline onClick={() => void share(title, media.siteUrl, t.common.copied)} />
      </div>

      {entry && (entry.status === "CURRENT" || entry.status === "REPEATING" || entry.status === "PAUSED") ? (
        <button type="button" onClick={openEditor} className="mt-4 flex w-full flex-col gap-2 px-4 text-left">
          <span className="flex items-baseline justify-between text-13">
            <span className="text-fg3">{t.media.yourProgress}</span>
            <span className="figure text-fg">
              {entry.progress ?? 0}
              <span className="text-fg3"> / {total ?? "?"}</span>
            </span>
          </span>
          <ProgressTrack watched={entry.progress ?? 0} aired={aired} total={total} size="md" label={t.media.yourProgress} />
        </button>
      ) : null}

      <dl className="mt-6 grid grid-cols-3 gap-4 px-4">
        <Stat label={t.media.averageScore} value={media.averageScore != null ? `${media.averageScore}%` : "—"} color={media.averageScore != null ? scoreTone(media.averageScore) : undefined} />
        <Stat label={t.media.popularity} value={formatCompact(media.popularity, t.locale)} />
        <Stat label={t.media.favourites} value={formatCompact(media.favourites, t.locale)} />
      </dl>

      {ranks.length > 0 || next ? (
        <div className="mt-4 flex flex-col gap-1 px-4 text-13">
          {next ? (
            <p className="text-fg2">
              <span className="figure">{t.media.nextEpisode(next.episode, formatCountdown(next.airingAt - now, t))}</span>
            </p>
          ) : null}
          {ranks.length > 0 ? <p className="text-fg3">{ranks.map((rank) => rankText(rank, t)).join(", ")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
