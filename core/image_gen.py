import io
import asyncio
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _download(url: str, size: tuple = None) -> Image.Image | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            img = Image.open(io.BytesIO(r.read())).convert("RGBA")
        if size:
            img = img.resize(size, Image.LANCZOS)
        return img
    except Exception:
        return None


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
            else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
            else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def _circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    return mask


def _paste_circle(base: Image.Image, img: Image.Image, pos: tuple, size: int, border_color=None, border_width=3):
    img = img.resize((size, size), Image.LANCZOS)
    mask = _circle_mask(size)
    if border_color:
        ring = Image.new("RGBA", (size + border_width * 2, size + border_width * 2), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse([0, 0, size + border_width * 2 - 1, size + border_width * 2 - 1], fill=border_color)
        base.paste(ring, (pos[0] - border_width, pos[1] - border_width), ring)
    base.paste(img, pos, mask)


def _rounded_rect(draw: ImageDraw.Draw, xy, r, fill, outline=None, outline_width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=outline_width)


def _gradient_overlay(img: Image.Image, direction: str, color: tuple, alpha_start: int, alpha_end: int):
    W, H = img.size
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    steps = H if direction in ("top", "bottom") else W
    for i in range(steps):
        t = i / steps
        a = int(alpha_start + (alpha_end - alpha_start) * t)
        r, g, b = color
        if direction == "bottom":
            draw.line([(0, i), (W, i)], fill=(r, g, b, a))
        elif direction == "top":
            draw.line([(0, steps - i - 1), (W, steps - i - 1)], fill=(r, g, b, a))
        elif direction == "right":
            draw.line([(i, 0), (i, H)], fill=(r, g, b, a))
    img = Image.alpha_composite(img, overlay)
    return img


def _download_cover(url: str, w: int, h: int) -> Image.Image | None:
    img = _download(url)
    if not img:
        return None
    img_ratio = img.width / img.height
    target_ratio = w / h
    if img_ratio > target_ratio:
        new_h = h
        new_w = int(h * img_ratio)
    else:
        new_w = w
        new_h = int(w / img_ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    return img.crop((left, top, left + w, top + h))


# ─── WRAPPED ──────────────────────────────────────────────────────────────────

async def generate_wrapped(user_data: dict) -> io.BytesIO:
    return await asyncio.get_event_loop().run_in_executor(None, _gen_wrapped_sync, user_data)


def _gen_wrapped_sync(d: dict) -> io.BytesIO:
    W, H = 1280, 900
    BG = (18, 22, 32)
    CARD = (26, 31, 46)
    CARD2 = (32, 38, 55)
    ACCENT = (99, 179, 237)
    GREEN = (72, 199, 142)
    YELLOW = (246, 198, 54)
    PURPLE = (159, 122, 234)
    WHITE = (255, 255, 255)
    GRAY = (140, 155, 180)
    DARK_GRAY = (60, 70, 90)

    canvas = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    # ── BANNER (left column background) ──────────────────────────────────────
    banner_url = d.get("banner_url")
    if banner_url:
        banner = _download(banner_url, (520, H))
        if banner:
            banner = banner.convert("RGBA")
            banner = _gradient_overlay(banner, "right", BG[:3], 0, 255)
            banner = _gradient_overlay(banner, "bottom", BG[:3], 0, 180)
            canvas.paste(banner, (0, 0), banner)

    # ── AVATAR ────────────────────────────────────────────────────────────────
    avatar_url = d.get("avatar_url")
    if avatar_url:
        av = _download(avatar_url)
        if av:
            _paste_circle(canvas, av, (50, 50), 120, border_color=(*ACCENT, 255), border_width=4)

    # ── USERNAME + TITLE ──────────────────────────────────────────────────────
    draw = ImageDraw.Draw(canvas)
    draw.text((190, 72), d.get("username", "?"), font=_font(38, bold=True), fill=WHITE)
    draw.text((190, 118), "AniList Wrapped 2025", font=_font(18), fill=(*ACCENT, 200))

    # ── TOP ANIME COVERS (center strip) ──────────────────────────────────────
    top_covers = d.get("top_covers", [])
    cover_y = 200
    cover_w, cover_h = 130, 190
    cover_gap = 16
    cover_x_start = 50
    for i, url in enumerate(top_covers[:5]):
        cx = cover_x_start + i * (cover_w + cover_gap)
        cover_img = _download_cover(url, cover_w, cover_h) if url else None
        if cover_img:
            # Shadow
            shadow = Image.new("RGBA", (cover_w + 8, cover_h + 8), (0, 0, 0, 100))
            canvas.paste(shadow, (cx + 4, cover_y + 4), shadow)
            # Cover with rounded mask
            mask = Image.new("L", (cover_w, cover_h), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, cover_w-1, cover_h-1], radius=8, fill=255)
            canvas.paste(cover_img.convert("RGBA"), (cx, cover_y), mask)
            # Rank badge
            badge_colors = [YELLOW, (*GRAY, 255), (205, 127, 50, 255)]
            bc = badge_colors[i] if i < 3 else (*DARK_GRAY, 255)
            draw.rounded_rectangle([cx + cover_w - 28, cover_y + 4, cx + cover_w - 4, cover_y + 24], radius=5, fill=bc)
            draw.text((cx + cover_w - 16, cover_y + 14), f"#{i+1}", font=_font(11, bold=True), fill=(20, 20, 20), anchor="mm")
        else:
            _rounded_rect(draw, [cx, cover_y, cx + cover_w, cover_y + cover_h], 8, CARD2)
            draw.text((cx + cover_w//2, cover_y + cover_h//2), "?", font=_font(24, bold=True), fill=GRAY, anchor="mm")

    # Top anime labels below covers
    top_anime = d.get("top_anime", [])
    label_y = cover_y + cover_h + 8
    for i, title in enumerate(top_anime[:5]):
        cx = cover_x_start + i * (cover_w + cover_gap) + cover_w // 2
        short = title[:12] + "…" if len(title) > 12 else title
        draw.text((cx, label_y), short, font=_font(11), fill=GRAY, anchor="mt")

    # ── DIVIDER ───────────────────────────────────────────────────────────────
    div_y = label_y + 28
    draw.line([(50, div_y), (W - 50, div_y)], fill=(*DARK_GRAY, 180), width=1)

    # ── STAT CARDS (row) ──────────────────────────────────────────────────────
    stats = [
        ("📺", "Anime Completed", str(d.get("anime_count", 0)), ACCENT),
        ("⏱", "Days Watched", str(d.get("days_watched", 0)), GREEN),
        ("📖", "Manga Read", str(d.get("manga_count", 0)), PURPLE),
        ("⭐", "Mean Score", f"{d.get('mean_score', 0):.1f}", YELLOW),
        ("🎬", "Episodes", str(d.get("episodes_watched", 0)), (255, 120, 120)),
    ]
    stat_y = div_y + 20
    stat_w = (W - 100 - 4 * 12) // 5
    for i, (icon, label, value, color) in enumerate(stats):
        sx = 50 + i * (stat_w + 12)
        _rounded_rect(draw, [sx, stat_y, sx + stat_w, stat_y + 100], 10, CARD)
        # colored top strip
        draw.rounded_rectangle([sx, stat_y, sx + stat_w, stat_y + 4], radius=2, fill=(*color, 200))
        draw.text((sx + stat_w//2, stat_y + 30), icon, font=_font(20), fill=WHITE, anchor="mm")
        draw.text((sx + stat_w//2, stat_y + 60), value, font=_font(24, bold=True), fill=color, anchor="mm")
        draw.text((sx + stat_w//2, stat_y + 84), label, font=_font(11), fill=GRAY, anchor="mm")

    # ── BOTTOM SECTION ────────────────────────────────────────────────────────
    bot_y = stat_y + 120
    left_w = 480
    right_x = left_w + 70

    # Left: Genre stats radar-style bar chart
    genres = d.get("top_genres", [])[:8]
    genre_counts = d.get("genre_counts", [])
    max_count = max(genre_counts[:8]) if genre_counts else 1

    draw.text((50, bot_y), "Genre Stats", font=_font(16, bold=True), fill=WHITE)
    bar_y = bot_y + 28
    bar_h = 22
    bar_gap = 8
    max_bar_w = left_w - 130

    genre_colors = [ACCENT, GREEN, PURPLE, YELLOW, (255, 120, 120),
                    (255, 165, 80), (120, 220, 200), (200, 120, 200)]

    for i, (genre, count) in enumerate(zip(genres, genre_counts[:8])):
        gy = bar_y + i * (bar_h + bar_gap)
        ratio = count / max_count if max_count else 0
        bw = int(max_bar_w * ratio)
        gc = genre_colors[i % len(genre_colors)]

        # Background bar
        _rounded_rect(draw, [50, gy, 50 + max_bar_w, gy + bar_h], 4, CARD)
        # Filled bar
        if bw > 4:
            _rounded_rect(draw, [50, gy, 50 + bw, gy + bar_h], 4, (*gc, 180))
        # Label
        draw.text((58, gy + bar_h//2), genre, font=_font(12), fill=WHITE, anchor="lm")
        draw.text((50 + max_bar_w - 4, gy + bar_h//2), str(count), font=_font(12, bold=True), fill=gc, anchor="rm")

    # Right: Activity + extra info
    draw.text((right_x, bot_y), "Activity", font=_font(16, bold=True), fill=WHITE)

    months = ["J","F","M","A","M","J","J","A","S","O","N","D"]
    monthly = d.get("monthly_activity", [0] * 12)
    chart_w = W - right_x - 50
    chart_h = 120
    chart_y = bot_y + 30
    max_act = max(monthly) if any(monthly) else 1

    # Chart background
    _rounded_rect(draw, [right_x, chart_y, right_x + chart_w, chart_y + chart_h], 8, CARD)

    bar_unit = chart_w / 12
    for i, val in enumerate(monthly):
        bx = right_x + int(i * bar_unit) + 4
        ratio = val / max_act
        bh = int((chart_h - 30) * ratio)
        bc_color = ACCENT if val == max_act else (*ACCENT, 100)
        if bh > 2:
            _rounded_rect(draw, [bx, chart_y + chart_h - 16 - bh, bx + int(bar_unit) - 8, chart_y + chart_h - 16], 2, bc_color)
        draw.text((bx + (bar_unit - 8)//2, chart_y + chart_h - 8), months[i], font=_font(10), fill=GRAY, anchor="mm")
        if val == max_act and val > 0:
            draw.text((bx + (bar_unit - 8)//2, chart_y + chart_h - 20 - bh), str(val), font=_font(10, bold=True), fill=YELLOW, anchor="mb")

    # Days active / most active
    extra_y = chart_y + chart_h + 16
    extra_items = [
        ("Days Active", d.get("days_active", "0/365")),
        ("Most Active", d.get("most_active_day", "N/A")),
        ("List Activity", str(d.get("list_activity", 0))),
    ]
    for i, (label, val) in enumerate(extra_items):
        ex = right_x + i * ((chart_w + 8) // 3)
        _rounded_rect(draw, [ex, extra_y, ex + chart_w // 3 - 8, extra_y + 52], 6, CARD)
        draw.text((ex + 10, extra_y + 10), label, font=_font(11), fill=GRAY)
        draw.text((ex + 10, extra_y + 28), val, font=_font(15, bold=True), fill=WHITE)

    # ── FOOTER ────────────────────────────────────────────────────────────────
    draw.line([(50, H - 36), (W - 50, H - 36)], fill=(*DARK_GRAY, 120), width=1)
    draw.text((50, H - 22), "westyasha.online • AniList Bot", font=_font(12), fill=(*GRAY, 120))
    draw.text((W - 50, H - 22), "@westyasha_AniList_bot", font=_font(12), fill=(*GRAY, 120), anchor="rs")

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True, quality=95)
    buf.seek(0)
    return buf


# ─── PROFILE CARD ─────────────────────────────────────────────────────────────

async def generate_profile_card(user_data: dict) -> io.BytesIO:
    return await asyncio.get_event_loop().run_in_executor(None, _gen_profile_card_sync, user_data)


def _gen_profile_card_sync(d: dict) -> io.BytesIO:
    W, H = 800, 320
    BG = (18, 22, 32)
    CARD = (26, 31, 46)
    ACCENT = (99, 179, 237)
    WHITE = (255, 255, 255)
    GRAY = (140, 155, 180)
    GREEN = (72, 199, 142)
    YELLOW = (246, 198, 54)
    PURPLE = (159, 122, 234)

    canvas = Image.new("RGBA", (W, H), BG)

    banner_url = d.get("banner_url")
    if banner_url:
        banner = _download(banner_url, (W, H))
        if banner:
            banner = banner.convert("RGBA")
            enh = ImageEnhance.Brightness(banner)
            banner = enh.enhance(0.45)
            banner = banner.filter(ImageFilter.GaussianBlur(2))
            canvas.paste(banner, (0, 0), banner)

    canvas = _gradient_overlay(canvas, "bottom", BG[:3], 40, 220)
    draw = ImageDraw.Draw(canvas)

    avatar_url = d.get("avatar_url")
    if avatar_url:
        av = _download(avatar_url)
        if av:
            _paste_circle(canvas, av, (32, H//2 - 52), 104, border_color=(*ACCENT, 255), border_width=3)
            draw = ImageDraw.Draw(canvas)

    tx = 155
    draw.text((tx, 58), d.get("username", "?"), font=_font(30, bold=True), fill=WHITE)
    draw.text((tx, 96), "AniList Profile", font=_font(14), fill=(*ACCENT, 180))

    fav = d.get("fav_anime", "")
    if fav:
        draw.text((tx, 122), f"❤  {fav[:45]}", font=_font(13), fill=WHITE)
    fav_char = d.get("fav_char", "")
    if fav_char:
        draw.text((tx, 144), f"⭐  {fav_char[:45]}", font=_font(13), fill=YELLOW)

    stats = [
        (str(d.get("anime_count", 0)), "Anime", ACCENT),
        (str(d.get("manga_count", 0)), "Manga", PURPLE),
        (f"{d.get('mean_score', 0):.1f}", "Score", YELLOW),
        (str(d.get("days_watched", 0)), "Days", GREEN),
    ]
    sy = H - 80
    sw = (W - tx - 24) // 4
    for i, (val, label, color) in enumerate(stats):
        sx = tx + i * sw
        draw.text((sx + sw//2, sy + 10), val, font=_font(20, bold=True), fill=color, anchor="mm")
        draw.text((sx + sw//2, sy + 32), label, font=_font(12), fill=GRAY, anchor="mm")

    draw.text((W - 16, H - 14), "@westyasha_AniList_bot", font=_font(11), fill=(*GRAY, 90), anchor="rs")

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf
