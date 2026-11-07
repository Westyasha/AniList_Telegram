import asyncio
import logging
import mimetypes
import time
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.services.cards.images import ImageStore
from app.services.metrics import metrics

log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = BASE_DIR / "templates"
ASSETS_DIR = BASE_DIR / "assets"
ASSET_ORIGIN = "https://card.local/"
CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    "--font-render-hinting=none",
]


def sniff_image(body: bytes) -> str:
    if body.startswith(b"\x89PNG"):
        return "image/png"
    if body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "image/webp"
    if body[:3] == b"GIF":
        return "image/gif"
    return "image/jpeg"


class CardRenderer:
    def __init__(self, concurrency: int = 2) -> None:
        self.images = ImageStore()
        self._jinja = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=select_autoescape(["html"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self._semaphore = asyncio.Semaphore(concurrency)
        self._lock = asyncio.Lock()
        self._playwright: Any = None
        self._browser: Any = None

    async def start(self) -> None:
        await self.images.start()
        try:
            await self._ensure_browser()
        except Exception:
            log.exception("Chromium failed to start; cards will be rendered lazily")

    async def close(self) -> None:
        await self.images.close()
        if self._browser is not None:
            await self._browser.close()
        if self._playwright is not None:
            await self._playwright.stop()

    async def _ensure_browser(self) -> Any:
        async with self._lock:
            if self._browser is not None and self._browser.is_connected():
                return self._browser
            from playwright.async_api import async_playwright

            if self._playwright is None:
                self._playwright = await async_playwright().start()
            started = time.perf_counter()
            self._browser = await self._playwright.chromium.launch(args=CHROMIUM_ARGS)
            log.info("Chromium ready in %.0f ms", (time.perf_counter() - started) * 1000)
            return self._browser

    async def _serve(self, route: Any) -> None:
        url: str = route.request.url
        if url.startswith(ASSET_ORIGIN):
            path = (ASSETS_DIR / url[len(ASSET_ORIGIN) :]).resolve()
            if ASSETS_DIR.resolve() in path.parents and path.is_file():
                content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                if path.suffix == ".woff2":
                    content_type = "font/woff2"
                await route.fulfill(body=path.read_bytes(), content_type=content_type)
                return
            await route.abort()
            return
        body = self.images.get(url)
        if body is not None:
            await route.fulfill(body=body, content_type=sniff_image(body))
            return
        if url.startswith("data:") or url == "about:blank":
            await route.continue_()
            return
        await route.abort()

    async def render(
        self,
        template: str,
        data: dict[str, Any],
        *,
        width: int,
        height: int | None = None,
        scale: float = 2.0,
    ) -> bytes:
        html = self._jinja.get_template(template).render(asset=ASSET_ORIGIN, **data)
        async with self._semaphore:
            started = time.perf_counter()
            for attempt in range(2):
                browser = await self._ensure_browser()
                try:
                    return await self._shoot(browser, html, width, height, scale, started)
                except Exception:
                    if attempt:
                        raise
                    log.warning("Renderer failed, restarting Chromium", exc_info=True)
                    async with self._lock:
                        self._browser = None
            raise RuntimeError("unreachable")

    async def _shoot(
        self, browser: Any, html: str, width: int, height: int | None, scale: float, started: float
    ) -> bytes:
        page = await browser.new_page(
            viewport={"width": width, "height": height or 600},
            device_scale_factor=scale,
            java_script_enabled=False,
        )
        await page.route("**/*", self._serve)
        try:
            await page.set_content(html, wait_until="load")
            await page.evaluate(
                "Promise.all([document.fonts.ready, ...Array.from(document.images, i => i.decode().catch(() => null))]).then(() => true)"
            )
            if height is None:
                size = await page.evaluate(
                    "({w: Math.ceil(document.documentElement.scrollWidth), h: Math.ceil(document.documentElement.scrollHeight)})"
                )
                width, height = max(size["w"], 600), max(size["h"], 300)
                await page.set_viewport_size({"width": width, "height": height})
            image = await page.screenshot(
                type="jpeg", quality=94, clip={"x": 0, "y": 0, "width": width, "height": height}
            )
        finally:
            await page.context.close()
        elapsed = (time.perf_counter() - started) * 1000
        metrics.renders.record(elapsed)
        log.info("Rendered %dx%d@%.2gx in %.0f ms", width, height, scale, elapsed)
        return image
