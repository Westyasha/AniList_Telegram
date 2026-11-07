import { Link } from "react-router";
import { Heart } from "lucide-react";
import type { CharacterEdge, ImageSet, PersonName } from "@/api/types";
import { useI18n } from "@/lib/i18n";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Image } from "@/components/ui/Image";

interface PersonCardProps {
  to: string;
  name: PersonName;
  image: ImageSet;
  subtitle?: string | null;
  favourites?: number | null;
  className?: string;
}

export function personName(name: PersonName | null | undefined): string {
  return name?.userPreferred || name?.full || "";
}

export function PersonCard({ to, name, image, subtitle, favourites, className }: PersonCardProps) {
  const { t } = useI18n();
  const label = personName(name);
  return (
    <Link to={to} className={cn("group flex min-w-0 flex-col gap-2", className)}>
      <div className="relative">
        <Image
          src={image.large ?? image.medium}
          alt={label}
          className="aspect-[2/3] w-full rounded-[var(--radius-card)] ring-1 ring-white/5 transition-transform duration-200 group-active:scale-[0.97]"
        />
        {favourites != null && favourites > 0 && (
          <span className="tabular absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10.5px] font-bold text-[#FB7185] backdrop-blur-sm">
            <Heart className="size-2.5 fill-current" />
            {formatCompact(favourites, t.locale)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[12.5px] leading-[1.3] font-semibold">{label}</p>
        {subtitle && <p className="mt-0.5 truncate text-[11px] font-semibold text-faint">{subtitle}</p>}
      </div>
    </Link>
  );
}

export function CharacterVoiceCard({ edge }: { edge: CharacterEdge }) {
  const { t } = useI18n();
  const actor = edge.voiceActors[0];
  return (
    <div className="flex h-[92px] overflow-hidden rounded-xl border border-line bg-surface">
      <Link to={`/character/${edge.node.id}`} className="flex min-w-0 flex-1 gap-2.5">
        <Image src={edge.node.image.medium ?? edge.node.image.large} alt="" className="h-full w-[62px] shrink-0" />
        <div className="flex min-w-0 flex-col justify-between py-2">
          <p className="line-clamp-2 text-[12.5px] leading-tight font-semibold">{personName(edge.node.name)}</p>
          <p className="text-[11px] font-semibold text-faint">{edge.role ? t.enums.role[edge.role] : ""}</p>
        </div>
      </Link>
      {actor && (
        <Link to={`/staff/${actor.id}`} className="flex min-w-0 flex-1 justify-end gap-2.5 text-right">
          <div className="flex min-w-0 flex-col justify-between py-2">
            <p className="line-clamp-2 text-[12.5px] leading-tight font-semibold">{personName(actor.name)}</p>
            <p className="text-[11px] font-semibold text-faint">{t.media.japanese}</p>
          </div>
          <Image src={actor.image.medium ?? actor.image.large} alt="" className="h-full w-[62px] shrink-0" />
        </Link>
      )}
    </div>
  );
}
