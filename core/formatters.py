from datetime import datetime, timezone


def esc(text: str) -> str:
    if not text:
        return ""
    for ch in r"\_*[]()~`>#+-=|{}.!":
        text = text.replace(ch, f"\\{ch}")
    return text


def fdate(d: dict) -> str:
    if not d or not d.get("year"):
        return "—"
    parts = [str(d["year"])]
    if d.get("month"):
        parts.insert(0, f"{d['month']:02d}")
        if d.get("day"):
            parts.insert(0, f"{d['day']:02d}")
    return ".".join(parts)


def ftime_until(sec: int) -> str:
    if sec <= 0:
        return "aired"
    d, h, m = sec // 86400, (sec % 86400) // 3600, (sec % 3600) // 60
    if d:
        return f"{d}d {h}h"
    if h:
        return f"{h}h {m}m"
    return f"{m}m"


def fairing_ts(ts: int) -> str:
    try:
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        return dt.strftime("%d.%m.%Y %H:%M UTC")
    except Exception:
        return "?"


def fstatus(s: str) -> str:
    return {"FINISHED": "Finished", "RELEASING": "Releasing", "NOT_YET_RELEASED": "Not yet",
            "CANCELLED": "Cancelled", "HIATUS": "Hiatus"}.get(s, s or "—")


def ffmt(f: str) -> str:
    return {"TV": "TV", "TV_SHORT": "TV Short", "MOVIE": "Movie", "SPECIAL": "Special",
            "OVA": "OVA", "ONA": "ONA", "MUSIC": "Music", "MANGA": "Manga",
            "NOVEL": "Novel", "ONE_SHOT": "One Shot"}.get(f, f or "—")


def fseason(s: str) -> str:
    return {"WINTER": "Winter", "SPRING": "Spring", "SUMMER": "Summer", "FALL": "Fall"}.get(s, s or "—")


def current_season():
    m = datetime.now().month
    y = datetime.now().year
    if m in (12, 1, 2):
        return "WINTER", (y + 1 if m == 12 else y)
    elif m in (3, 4, 5):
        return "SPRING", y
    elif m in (6, 7, 8):
        return "SUMMER", y
    return "FALL", y


def clean_desc(text: str, limit: int = 600) -> str:
    if not text:
        return ""
    import re
    text = re.sub(r'<[^>]+>', ' ', text)
    text = text.replace("~!", "").replace("!~", "").replace("\n\n", "\n").strip()
    if len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0] + "…"
    return text


def media_card(media: dict) -> str:
    t = media.get("title", {})
    title = t.get("english") or t.get("romaji") or "?"
    title_ro = t.get("romaji", "")
    title_jp = t.get("native", "")

    lines = [f"*{esc(title)}*"]
    if title_ro and title_ro != title:
        lines.append(f"_{esc(title_ro)}_")
    if title_jp:
        lines.append(f"_{esc(title_jp)}_")
    lines.append("")

    mtype = media.get("type", "")
    fmt = ffmt(media.get("format"))
    status = fstatus(media.get("status", ""))
    score = media.get("averageScore") or 0
    pop = media.get("popularity") or 0
    favs = media.get("favourites") or 0
    country = media.get("countryOfOrigin", "")

    lines.append(f"📺 *{esc(mtype)}* \\| {esc(fmt)}" + (f" \\| {esc(country)}" if country else ""))
    lines.append(f"📊 *{esc(status)}*")
    if score:
        score_bar = "█" * (score // 10) + "░" * (10 - score // 10)
        lines.append(f"⭐ *{score}/100* `{score_bar}`")
        lines.append(f"👥 {esc(f'{pop:,}')} \\| ❤️ {esc(f'{favs:,}')}")

    sea = media.get("season")
    sea_year = media.get("seasonYear")
    if sea:
        lines.append(f"🗓 *{esc(fseason(sea))} {esc(str(sea_year or ''))}*")

    eps = media.get("episodes")
    chs = media.get("chapters")
    dur = media.get("duration")
    vols = media.get("volumes")
    if eps:
        lines.append(f"🎬 *Ep:* {esc(str(eps))}" + (f" × {esc(str(dur))} min" if dur else ""))
    if chs:
        lines.append(f"📖 *Ch:* {esc(str(chs))}" + (f" / Vol: {esc(str(vols))}" if vols else ""))

    start = fdate(media.get("startDate"))
    end = fdate(media.get("endDate"))
    lines.append(f"📅 {esc(start)} → {esc(end)}")

    studios = media.get("studios", {}).get("nodes", [])
    if studios:
        lines.append(f"🏢 {esc(', '.join(s['name'] for s in studios[:2]))}")

    genres = media.get("genres", [])
    if genres:
        lines.append(f"🏷 {esc(', '.join(genres[:5]))}")

    next_ep = media.get("nextAiringEpisode")
    if next_ep:
        tstr = ftime_until(next_ep["timeUntilAiring"])
        lines.append(f"⏰ *Ep {esc(str(next_ep['episode']))}* in {esc(tstr)}")

    ml = media.get("mediaListEntry")
    if ml:
        lines.append("")
        list_status = {
            "CURRENT": "▶️ Watching/Reading", "PLANNING": "⏸ Planning",
            "COMPLETED": "✅ Completed", "DROPPED": "⏹ Dropped",
            "PAUSED": "⏸ On Hold", "REPEATING": "🔄 Rewatching"
        }.get(ml["status"], ml["status"])
        lines.append(f"📋 {esc(list_status)}")
        if ml.get("score"):
            lines.append(f"Your score: *{esc(str(int(ml['score'])))}/10*")
        if ml.get("progress"):
            total = eps or chs or "?"
            lines.append(f"Progress: *{esc(str(ml['progress']))}/{esc(str(total))}*")
        if ml.get("notes"):
            lines.append(f"📝 _{esc(ml['notes'][:80])}_")

    rankings = [r for r in media.get("rankings", []) if r.get("allTime") and r["rank"] <= 100]
    if rankings:
        lines.append("")
        for r in rankings[:2]:
            lines.append(f"🏆 *\\#{esc(str(r['rank']))}* {esc(r['context'])}")

    desc = clean_desc(media.get("description", ""))
    if desc:
        lines.append("")
        lines.append(esc(desc))

    ext_links = [lnk for lnk in media.get("externalLinks", []) if lnk.get("site") in ("Crunchyroll", "Funimation", "Netflix", "YouTube")]
    if ext_links:
        lines.append("")
        links_str = " \\| ".join(f"[{esc(lnk['site'])}]({lnk['url']})" for lnk in ext_links[:3])
        lines.append(f"🎥 {links_str}")

    return "\n".join(lines)


def char_card(char: dict) -> str:
    name = char["name"].get("full", "")
    native = char["name"].get("native", "")
    alt = [a for a in char["name"].get("alternative", []) if a]

    lines = [f"*{esc(name)}*"]
    if native:
        lines.append(f"_{esc(native)}_")
    if alt:
        lines.append(f"Also: {esc(', '.join(alt[:3]))}")
    lines.append("")

    if char.get("gender"):
        lines.append(f"🚻 {esc(char['gender'])}")
    if char.get("age"):
        lines.append(f"🎂 Age: {esc(str(char['age']))}")
    dob = char.get("dateOfBirth", {})
    if dob and dob.get("month"):
        lines.append(f"📅 Birthday: {esc(fdate(dob))}")
    if char.get("favourites"):
        lines.append(f"❤️ {char['favourites']:,} favourites")

    desc = clean_desc(char.get("description", ""), 500)
    if desc:
        lines.append("")
        lines.append(esc(desc))

    nodes = char.get("media", {}).get("nodes", [])
    if nodes:
        lines.append("")
        lines.append("*Appears in:*")
        for m in nodes[:5]:
            fmt = ffmt(m.get("format", ""))
            score = m.get("averageScore") or 0
            lines.append(f"• {esc(m['title']['romaji'])} \\[{esc(fmt)}\\]" + (f" ⭐{score}" if score else ""))

    return "\n".join(lines)


def staff_card(staff: dict) -> str:
    name = staff["name"].get("full", "")
    native = staff["name"].get("native", "")
    lines = [f"*{esc(name)}*"]
    if native:
        lines.append(f"_{esc(native)}_")
    lines.append("")

    occ = staff.get("primaryOccupations") or []
    if occ:
        lines.append(f"💼 {esc(', '.join(occ))}")
    if staff.get("languageV2"):
        lines.append(f"🗣 {esc(staff['languageV2'])}")
    if staff.get("gender"):
        lines.append(f"🚻 {esc(staff['gender'])}")
    if staff.get("age"):
        lines.append(f"🎂 {esc(str(staff['age']))}")
    if staff.get("favourites"):
        lines.append(f"❤️ {staff['favourites']:,} favourites")

    desc = clean_desc(staff.get("description", ""), 400)
    if desc:
        lines.append("")
        lines.append(esc(desc))

    nodes = staff.get("staffMedia", {}).get("nodes", [])
    if nodes:
        lines.append("")
        lines.append("*Works:*")
        for m in nodes[:5]:
            fmt = ffmt(m.get("format", ""))
            score = m.get("averageScore") or 0
            lines.append(f"• {esc(m['title']['romaji'])} \\[{esc(fmt)}\\]" + (f" ⭐{score}" if score else ""))

    return "\n".join(lines)


def profile_card(viewer: dict, lang: str = "ru") -> str:
    name = viewer.get("name", "")
    about = clean_desc(viewer.get("about", ""), 200)
    stats = viewer.get("statistics", {})
    a = stats.get("anime", {})
    mg = stats.get("manga", {})
    site_url = viewer.get("siteUrl", "")

    if lang == "ru":
        lines = [f"👤 *[{esc(name)}]({site_url})*" if site_url else f"👤 *{esc(name)}*"]
        if about:
            lines.append(f"_{esc(about)}_")

        count = a.get("count", 0)
        eps = a.get("episodesWatched", 0)
        mins = a.get("minutesWatched", 0)
        days = mins // 1440
        hours = (mins % 1440) // 60
        mean = a.get("meanScore", 0)
        std = a.get("standardDeviation", 0)

        lines.append("")
        lines.append("📺 *Аниме*")
        lines.append(f"  Тайтлов: *{esc(str(count))}* · Эпизодов: *{esc(f'{eps:,}')}*")
        lines.append(f"  Времени: *{esc(str(days))}д {esc(str(hours))}ч*")
        if mean:
            lines.append(f"  Ср\\. оценка: *{esc(str(mean))}*" + (f" \\(σ {esc(str(std))}\\)" if std else ""))

        mc = mg.get("count", 0)
        mch = mg.get("chaptersRead", 0)
        mvol = mg.get("volumesRead", 0)
        mmean = mg.get("meanScore", 0)
        lines.append("")
        lines.append("📚 *Манга*")
        lines.append(f"  Тайтлов: *{esc(str(mc))}* · Глав: *{esc(f'{mch:,}')}*" + (f" · Томов: *{esc(f'{mvol:,}')}*" if mvol else ""))
        if mmean:
            lines.append(f"  Ср\\. оценка: *{esc(str(mmean))}*")

        favs = viewer.get("favourites", {})
        fav_anime = favs.get("anime", {}).get("nodes", [])
        fav_chars = favs.get("characters", {}).get("nodes", [])

        if fav_anime:
            lines.append("")
            lines.append("❤️ *Любимое аниме:*")
            for an in fav_anime[:5]:
                title = an["title"].get("english") or an["title"].get("romaji") or "?"
                aid = an.get("id")
                url = f"https://anilist.co/anime/{aid}" if aid else ""
                lines.append(f"  · [{esc(title)}]({url})" if url else f"  · {esc(title)}")

        if fav_chars:
            lines.append("")
            lines.append("💕 *Любимые персонажи:*")
            for c in fav_chars[:5]:
                cname = c["name"].get("full") or "?"
                cid = c.get("id")
                curl = f"https://anilist.co/character/{cid}" if cid else ""
                lines.append(f"  · [{esc(cname)}]({curl})" if curl else f"  · {esc(cname)}")
    else:
        lines = [f"👤 *[{esc(name)}]({site_url})*" if site_url else f"👤 *{esc(name)}*"]
        if about:
            lines.append(f"_{esc(about)}_")

        count = a.get("count", 0)
        eps = a.get("episodesWatched", 0)
        mins = a.get("minutesWatched", 0)
        days = mins // 1440
        hours = (mins % 1440) // 60
        mean = a.get("meanScore", 0)
        std = a.get("standardDeviation", 0)

        lines.append("")
        lines.append("📺 *Anime*")
        lines.append(f"  Titles: *{esc(str(count))}* · Episodes: *{esc(f'{eps:,}')}*")
        lines.append(f"  Time: *{esc(str(days))}d {esc(str(hours))}h*")
        if mean:
            lines.append(f"  Mean score: *{esc(str(mean))}*" + (f" \\(σ {esc(str(std))}\\)" if std else ""))

        mc = mg.get("count", 0)
        mch = mg.get("chaptersRead", 0)
        mvol = mg.get("volumesRead", 0)
        mmean = mg.get("meanScore", 0)
        lines.append("")
        lines.append("📚 *Manga*")
        lines.append(f"  Titles: *{esc(str(mc))}* · Chapters: *{esc(f'{mch:,}')}*" + (f" · Volumes: *{esc(f'{mvol:,}')}*" if mvol else ""))
        if mmean:
            lines.append(f"  Mean score: *{esc(str(mmean))}*")

        favs = viewer.get("favourites", {})
        fav_anime = favs.get("anime", {}).get("nodes", [])
        fav_chars = favs.get("characters", {}).get("nodes", [])

        if fav_anime:
            lines.append("")
            lines.append("❤️ *Favourite Anime:*")
            for an in fav_anime[:5]:
                title = an["title"].get("english") or an["title"].get("romaji") or "?"
                aid = an.get("id")
                url = f"https://anilist.co/anime/{aid}" if aid else ""
                lines.append(f"  · [{esc(title)}]({url})" if url else f"  · {esc(title)}")

        if fav_chars:
            lines.append("")
            lines.append("💕 *Favourite Characters:*")
            for c in fav_chars[:5]:
                cname = c["name"].get("full") or "?"
                cid = c.get("id")
                curl = f"https://anilist.co/character/{cid}" if cid else ""
                lines.append(f"  · [{esc(cname)}]({curl})" if curl else f"  · {esc(cname)}")

    return "\n".join(lines)
