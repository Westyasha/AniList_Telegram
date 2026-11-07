import type { Dict } from "@/lib/i18n";

export type OutcomeKind = "ok" | "cancelled" | "expired" | "exchange" | "rate" | "missing" | "network";

export function outcomeCopy(kind: OutcomeKind, t: Dict, name: string | null): { title: string; body: string } {
  const c = t.confirm;
  switch (kind) {
    case "ok":
      return { title: c.doneTitle, body: c.doneBody(name ?? "AniList") };
    case "cancelled":
      return { title: c.cancelledTitle, body: c.cancelledBody };
    case "expired":
      return { title: c.expiredTitle, body: c.expiredBody };
    case "exchange":
      return { title: c.exchangeTitle, body: c.exchangeBody };
    case "rate":
      return { title: c.rateTitle, body: c.rateBody };
    case "missing":
      return { title: c.missingTitle, body: c.missingBody };
    default:
      return { title: c.failedTitle, body: c.failedBody };
  }
}

export function Outcome({ kind, t, name, botHref }: { kind: OutcomeKind; t: Dict; name: string | null; botHref: string }) {
  const copy = outcomeCopy(kind, t, name);
  const success = kind === "ok";
  return (
    <section aria-live="polite" className="flex max-w-[520px] flex-col items-start gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-32 font-semibold text-fg">{copy.title}</h1>
        <p className="text-17 text-fg2">{copy.body}</p>
      </div>
      <a
        href={botHref}
        rel="noopener noreferrer"
        className={
          success
            ? "chamfer-btn inline-flex h-11 items-center rounded-control bg-accent px-5 text-15 font-semibold text-on-accent transition-[transform,background-color] duration-120 hover:bg-accent-press pressed:scale-[0.98]"
            : "inline-flex h-11 items-center rounded-control border border-line bg-s2 px-5 text-15 font-medium text-fg transition-colors duration-120 hover:bg-s3"
        }
      >
        {t.confirm.back}
      </a>
    </section>
  );
}
