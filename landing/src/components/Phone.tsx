import Image, { type StaticImageData } from "next/image";

export function Phone({ src, alt, className, priority = false }: { src: StaticImageData; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`relative rounded-[44px] bg-[#16161a] p-[9px] shadow-[0_40px_80px_-24px_rgb(0_0_0/0.7),inset_0_0_0_1px_rgb(255_255_255/0.08)] ${className ?? ""}`}>
      <div className="relative overflow-hidden rounded-[36px] bg-bg">
        <Image src={src} alt={alt} placeholder="blur" priority={priority} sizes="(min-width: 1024px) 340px, 280px" className="block h-auto w-full" />
        <div aria-hidden className="absolute left-1/2 top-2.5 h-[22px] w-[30%] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}
