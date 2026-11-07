import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function Icon({ icon: Glyph, className, filled = false }: { icon: LucideIcon; className?: string; filled?: boolean }) {
  return <Glyph aria-hidden size={18} strokeWidth={1.5} className={cn("shrink-0", filled && "fill-current", className)} />;
}
