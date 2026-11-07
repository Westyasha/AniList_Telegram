import type { Locale } from "@/lib/site";
import { SmoothScroll } from "./SmoothScroll";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { ChatDemo } from "./ChatDemo";
import { Alerts } from "./Alerts";
import { Gallery } from "./Gallery";
import { Cards } from "./Cards";
import { Details } from "./Details";
import { Source } from "./Source";
import { Final } from "./Final";

export function Landing({ locale }: { locale: Locale }) {
  return (
    <SmoothScroll>
      <div lang={locale}>
        <Nav locale={locale} />
        <main>
          <Hero locale={locale} />
          <ChatDemo locale={locale} />
          <Alerts locale={locale} />
          <Gallery locale={locale} />
          <Cards locale={locale} />
          <Details locale={locale} />
          <Source locale={locale} />
          <Final locale={locale} />
        </main>
      </div>
    </SmoothScroll>
  );
}
