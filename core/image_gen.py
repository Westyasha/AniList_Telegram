import io
import asyncio
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_jinja = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


async def _render(template_name: str, data: dict, width: int, height: int) -> io.BytesIO:
    from playwright.async_api import async_playwright

    html = _jinja.get_template(template_name).render(**data)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        page = await browser.new_page(viewport={"width": width, "height": height})
        await page.set_content(html, wait_until="networkidle")
        await asyncio.sleep(0.3)
        buf = await page.screenshot(clip={"x": 0, "y": 0, "width": width, "height": height})
        await browser.close()

    return io.BytesIO(buf)


async def generate_wrapped(data: dict) -> io.BytesIO:
    render_data = {
        "username":         data.get("username", "?"),
        "banner_url":       data.get("banner_url") or "",
        "avatar_url":       data.get("avatar_url") or "",
        "anime_count":      data.get("anime_count", 0),
        "manga_count":      data.get("manga_count", 0),
        "days_watched":     data.get("days_watched", 0),
        "mean_score":       f"{data.get('mean_score', 0):.1f}",
        "episodes_watched": data.get("episodes_watched", 0),
        "genres":           data.get("top_genres", [])[:8],
        "genre_counts":     data.get("genre_counts", [])[:8],
        "max_genre_count":  max(data.get("genre_counts", [1])[:8]) if data.get("genre_counts") else 1,
        "top_anime":        data.get("top_anime", []),
        "top_covers":       data.get("top_covers", []),
        "monthly_activity": data.get("monthly_activity", [0] * 12),
        "list_activity":    data.get("list_activity", 0),
        "chapters_read":    data.get("chapters_read", 0),
        "manga_score":      f"{data.get('manga_score', 0):.1f}",
    }
    return await _render("wrapped.html", render_data, 1080, 1920)


async def generate_profile_card(data: dict) -> io.BytesIO:
    render_data = {
        "username":    data.get("username", "?"),
        "banner_url":  data.get("banner_url") or "",
        "avatar_url":  data.get("avatar_url") or "",
        "anime_count": data.get("anime_count", 0),
        "manga_count": data.get("manga_count", 0),
        "mean_score":  f"{data.get('mean_score', 0):.1f}",
        "days_watched": data.get("days_watched", 0),
        "fav_anime":   data.get("fav_anime", ""),
        "fav_char":    data.get("fav_char", ""),
    }
    return await _render("profile_card.html", render_data, 2560, 823)
