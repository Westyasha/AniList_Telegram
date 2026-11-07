"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "@/api/session";
import { ambientStore } from "@/lib/appearance";
import { useStore } from "@/lib/store";

export function useAmbient(url: string | null | undefined): void {
  useEffect(() => {
    if (!url) return;
    ambientStore.set(url);
    return () => {
      if (ambientStore.get() === url) ambientStore.set(null);
    };
  }, [url]);
}

export function Ambient() {
  const session = useSession();
  const page = useStore(ambientStore);
  const source = page ?? session.anilist?.banner ?? session.anilist?.avatar ?? null;
  const [layers, setLayers] = useState<{ current: string | null; previous: string | null }>({ current: source, previous: null });

  if (layers.current !== source) setLayers({ current: source, previous: layers.current });

  return (
    <div aria-hidden className="ambient">
      {layers.previous ? <Image key={`p-${layers.previous}`} src={layers.previous} alt="" fill sizes="160px" quality={40} className="ambient-img ambient-out" /> : null}
      {layers.current ? <Image key={`c-${layers.current}`} src={layers.current} alt="" fill sizes="160px" quality={40} className="ambient-img ambient-in" /> : null}
      <div className="ambient-shade" />
    </div>
  );
}
