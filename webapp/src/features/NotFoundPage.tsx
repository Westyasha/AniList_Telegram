import { Link } from "react-router";
import { Compass } from "lucide-react";
import { useT } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/States";

export function NotFoundPage() {
  const t = useT();
  return (
    <div style={{ paddingTop: "calc(var(--safe-top) + 64px)" }}>
      <EmptyState
        icon={<Compass className="size-6" />}
        title={t.common.notFound}
        action={
          <Link to="/" className="inline-flex h-11 items-center rounded-xl bg-surface-3 px-4 text-sm font-semibold">
            {t.tabs.home}
          </Link>
        }
      />
    </div>
  );
}
