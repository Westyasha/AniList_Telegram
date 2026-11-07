import type { ReactNode } from "react";
import { Clock, Heart, Plus, Share2, Star, TrendingUp, Trophy } from "lucide-react";
import type { MediaDetails, MediaRank } from "@/api/types";
import { useAuthGuard } from "@/api/auth";
import { useToggleFavourite } from "@/api/mutations";
import { useSession, useTitle } from "@/api/session";
import { useT, type Dict } from "@/lib/i18n";
import { formatCompact, formatCountdown } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { scoreTone } from "@/lib/score";
import { shareInline } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Banner } from "@/components/media/Banner";
import { Image } from "@/components/ui/Image";
import { IconButton } from "@/components/ui/Button";
import { ScoreDisplay } from "@/components/ui/ScoreInput";
import { openListEditor } from "@/components/media/ListEditor";
import { STATUS_COLOR, statusLabel } from "@/components/media/status";

function rankLabel(rank: MediaRank, t: Dict): string {
  const kind = rank.type === "RATED" ? t.media.rankRated : t.media.rankPopular;
  if (rank.allTime) return `#${rank.rank} ${kind} · ${t.media.allTime}`;
  if (rank.season && rank.year) return `#${rank.rank} ${kind} · ${t.enums.season[rank.season]} ${rank.year}`;
  if (rank.year) return `#${rank.rank} ${kind} · ${rank.year}`;
  return `#${rank.rank} ${kind}`;
}

function topRanks(ranks: MediaRank[]): MediaRank[] {
  const pick = (type: MediaRank["type"]) =>
    ranks.find((r) => r.type === type && r.allTime) ?? ranks.find((r) => r.type === type && r.year && !r.season) ?? ranks.find((r) => r.type === type);
  return [pick("RATED"), pick("POPULAR")].filter((r): r is MediaRank => Boolean(r));
}

async function share(title: string, url: string | null, copied: string): Promise<void> {
  if (shareInline(title)) return;
  const target = url ?? window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, url: target });
      return;
    } catch {
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(target);
    toast.success(copied);
  } catch {
    return;
  }
}

export function MediaHeader({ media }: { media: MediaDetails }) {
  const t = useT();
  const session = useSession();
  const title = useTitle()(media.title);
  const guard = useAuthGuard();
  const favourite = useToggleFavourite();
  const now = useNow(30_000);
  const entry = media.mediaListEntry;
  const year = media.seasonYear ?? media.startDate.year;
  const units = media.type === "ANIME" ? media.episodes : media.chapters;
  const ranks = topRanks(media.rankings ?? []);
  const subtitle = media.title.native && media.title.native !== title ? media.title.native : media.title.romaji !== title ? media.title.romaji : null;
  const next = media.nextAiringEpisode;
  const meta = [
    media.format ? t.enums.format[media.format] : null,
    year,
    units ? (media.type === "ANIME" ? t.common.episodes(units) : t.common.chapters(units)) : null,
    media.status ? t.enums.status[media.status] : null,
  ].filter(Boolean);

  const openEditor = guard(() =>
    openListEditor({
      media: {
        id: media.id,
        type: media.type,
        status: media.status,
        episodes: media.episodes,
        chapters: media.chapters,
        volumes: media.volumes,
        title: media.title,
        coverImage: media.coverImage,
        bannerImage: media.bannerImage,
      },
      entry,
    }),
  );

  const toggleFavourite = guard(() => favourite.mutate({ kind: media.type === "ANIME" ? "anime" : "manga", id: media.id }));

  return (
    <div>
      <Banner src={media.bannerImage} fallback={media.coverImage.extraLarge} color={media.coverImage.color} />
      <div className="relative z-10 -mt-[92px] flex gap-4 px-4">
        <Image
          src={media.coverImage.extraLarge ?? media.coverImage.large}
          placeholder={media.coverImage.medium}
          alt={title}
          color={media.coverImage.color}
          eager
          className="aspect-[2/3] w-[116px] shrink-0 rounded-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-end pb-1">
          <h1 className="line-clamp-3 text-[19px] leading-[1.2] font-extrabold tracking-[-0.015em]">{title}</h1>
          {subtitle && <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted">{subtitle}</p>}
          <p className="mt-1.5 text-[11.5px] font-semibold text-faint">{meta.join(" · ")}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 px-4">
        <button
          type="button"
          onClick={openEditor}
          className={cn(
            "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-[filter,transform] active:scale-[0.98]",
            entry?.status ? "border border-line-strong bg-surface-2 text-fg" : "bg-primary text-white hover:bg-primary-hover",
          )}
        >
          {entry?.status ? (
            <>
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[entry.status] }} aria-hidden />
              <span className="truncate">{statusLabel(t, media.type, entry.status)}</span>
              {(entry.progress ?? 0) > 0 && (
                <span className="tabular text-xs font-semibold text-muted">
                  {entry.progress}
                  {units ? `/${units}` : ""}
                </span>
              )}
              {session.anilist && (entry.score ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  · <ScoreDisplay raw={entry.score} format={session.anilist.score_format} />
                </span>
              )}
            </>
          ) : (
            <>
              <Plus className="size-4" />
              {t.media.addToList}
            </>
          )}
        </button>
        <IconButton
          label={t.media.favourite}
          active={media.isFavourite}
          onClick={toggleFavourite}
          className="size-12 rounded-xl border border-line bg-surface-2"
        >
          <Heart className={cn("size-5", media.isFavourite && "fill-current")} />
        </IconButton>
        <IconButton
          label={t.media.share}
          onClick={() => void share(title, media.siteUrl, t.common.copied)}
          className="size-12 rounded-xl border border-line bg-surface-2"
        >
          <Share2 className="size-5" />
        </IconButton>
      </div>

      {next && (
        <div className="mt-3 px-4">
          <div className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3.5 text-[13px] font-semibold text-[var(--accent-text)]">
            <Clock className="size-4" />
            <span className="tabular">{t.media.nextEpisode(next.episode, formatCountdown(next.airingAt - now, t))}</span>
          </div>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 px-4">
        <Stat icon={<Star className="size-3.5" />} label={t.media.averageScore} value={media.averageScore != null ? `${media.averageScore}%` : "—"} color={scoreTone(media.averageScore)} />
        <Stat icon={<TrendingUp className="size-3.5" />} label={t.media.popularity} value={formatCompact(media.popularity, t.locale)} />
        <Stat icon={<Heart className="size-3.5" />} label={t.media.favourites} value={formatCompact(media.favourites, t.locale)} color="#FB7185" />
      </dl>

      {ranks.length > 0 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
          {ranks.map((rank) => (
            <span
              key={rank.id}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[11.5px] font-semibold text-muted"
            >
              {rank.type === "RATED" ? <Trophy className="size-3.5 text-planning" /> : <Heart className="size-3.5 text-[#FB7185]" />}
              <span className="first-letter:uppercase">{rankLabel(rank, t)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-3 py-2.5">
      <dt className="flex items-center gap-1 text-[10.5px] font-semibold text-faint">
        <span style={{ color }}>{icon}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular text-[15px] font-extrabold" style={{ color }}>
        {value}
      </dd>
    </div>
  );
}
