import Link from "next/link";
import type { ImageSet, PersonName } from "@/api/types";
import { cn } from "@/lib/cn";
import { Poster } from "./Poster";

export function personName(name: PersonName | null | undefined): string {
  return name?.userPreferred || name?.full || "";
}

interface PersonTileProps {
  href: string;
  name: PersonName;
  image: ImageSet;
  subtitle?: string | null;
  sizes?: string;
  className?: string;
}

export function PersonTile({ href, name, image, subtitle, sizes = "(max-width: 560px) 33vw, 140px", className }: PersonTileProps) {
  const label = personName(name);
  return (
    <Link href={href} className={cn("group flex min-w-0 flex-col gap-2", className)}>
      <Poster src={image.large ?? image.medium} alt={label} sizes={sizes} className="transition-transform duration-120 group-active:scale-[0.98]" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-13 font-medium text-fg">{label}</span>
        {subtitle ? <span className="truncate text-12 text-fg3">{subtitle}</span> : null}
      </span>
    </Link>
  );
}
