import Image from "next/image";
import type { Copy } from "@/lib/copy";
import type { Aired } from "@/lib/site";
import { Mark } from "./brand";

export function AlertMessage({ item, t, className }: { item: Aired; t: Copy["alert"]; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[14px] bg-tg-bubble shadow-[0_24px_48px_-20px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(255_255_255/0.06)] ${className ?? ""}`}>
      <div className="flex gap-3 p-3">
        <div className="facet relative h-[72px] w-12 shrink-0 overflow-hidden [--cut:6px]" style={{ background: item.color }}>
          <Image src={item.image} alt="" width={96} height={144} className="absolute inset-0 size-full object-cover" />
        </div>
        <div className="min-w-0 flex-1 text-[14px] leading-[20px]">
          <div className="flex items-center gap-1.5">
            <Mark size={14} />
            <span className="text-[12px] text-fg3">AniList</span>
            <span className="ml-auto text-[12px] text-fg3">{t.now}</span>
          </div>
          <p className="mt-1 font-semibold text-fg">🔔 {t.head}</p>
          <p className="truncate font-semibold text-fg">{item.title}</p>
          <p className="text-fg2">{t.body(item.episode, item.episodes)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line text-center text-[13px] text-fg">
        <span className="truncate bg-tg-bubble px-2 py-2">{t.mark(item.episode)}</span>
        <span className="truncate bg-tg-bubble px-2 py-2">{t.open}</span>
      </div>
    </div>
  );
}
