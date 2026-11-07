import asyncio
import base64
import colorsys
import io
import logging
from collections import OrderedDict
from collections.abc import Iterable
from urllib.parse import urlsplit

import aiohttp
from PIL import Image, ImageFilter

from app.anilist.client import USER_AGENT

log = logging.getLogger(__name__)

ALLOWED_HOSTS = ("s4.anilist.co", "img.anili.st", "img1.ak.crunchyroll.com")
MAX_IMAGE_BYTES = 6 * 1024 * 1024


class ImageStore:
    def __init__(self, capacity_bytes: int = 96 * 1024 * 1024, concurrency: int = 8) -> None:
        self._data: OrderedDict[str, bytes] = OrderedDict()
        self._size = 0
        self._capacity = capacity_bytes
        self._semaphore = asyncio.Semaphore(concurrency)
        self._session: aiohttp.ClientSession | None = None

    async def start(self) -> None:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10),
                headers={"User-Agent": USER_AGENT},
            )

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    def get(self, url: str) -> bytes | None:
        value = self._data.get(url)
        if value is not None:
            self._data.move_to_end(url)
        return value

    def _put(self, url: str, value: bytes) -> None:
        if url in self._data:
            self._size -= len(self._data.pop(url))
        self._data[url] = value
        self._size += len(value)
        while self._size > self._capacity and self._data:
            _, evicted = self._data.popitem(last=False)
            self._size -= len(evicted)

    async def fetch(self, url: str) -> bytes | None:
        if not url or urlsplit(url).hostname not in ALLOWED_HOSTS or urlsplit(url).scheme != "https":
            return None
        cached = self.get(url)
        if cached is not None:
            return cached
        await self.start()
        assert self._session is not None
        async with self._semaphore:
            cached = self.get(url)
            if cached is not None:
                return cached
            try:
                async with self._session.get(url) as resp:
                    if resp.status != 200 or (resp.content_length or 0) > MAX_IMAGE_BYTES:
                        return None
                    body = await resp.read()
            except (TimeoutError, aiohttp.ClientError) as exc:
                log.debug("Image fetch failed %s: %s", url, exc)
                return None
        if len(body) > MAX_IMAGE_BYTES:
            return None
        self._put(url, body)
        return body

    async def prefetch(self, urls: Iterable[str | None]) -> dict[str, bytes]:
        unique = [u for u in dict.fromkeys(urls) if u]
        results = await asyncio.gather(*(self.fetch(u) for u in unique))
        return {u: body for u, body in zip(unique, results, strict=True) if body}


def blurred_backdrop(data: bytes | None, width: int = 640, radius: int = 18, brightness: float = 0.55) -> str | None:
    if not data:
        return None
    try:
        with Image.open(io.BytesIO(data)) as img:
            img = img.convert("RGB")
            ratio = width / img.width
            img = img.resize((width, max(1, int(img.height * ratio))), Image.Resampling.BILINEAR)
            img = img.filter(ImageFilter.GaussianBlur(radius))
            img = Image.eval(img, lambda v: int(v * brightness))
            buffer = io.BytesIO()
            img.save(buffer, "JPEG", quality=82)
    except (OSError, ValueError):
        return None
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def accent_colors(data: bytes | None, fallback: tuple[str, str] = ("#E0233D", "#8E0C22")) -> tuple[str, str]:
    if not data:
        return fallback
    try:
        with Image.open(io.BytesIO(data)) as img:
            small = img.convert("RGB").resize((48, 48))
            quantized = small.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
            palette = quantized.getpalette() or []
            counts = sorted(quantized.getcolors() or [], reverse=True)
    except (OSError, ValueError):
        return fallback
    picked: list[str] = []
    for _, index in counts:
        r, g, b = palette[index * 3 : index * 3 + 3]
        hue, light, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if sat < 0.18 or light < 0.12 or light > 0.92:
            continue
        r2, g2, b2 = colorsys.hls_to_rgb(hue, min(0.62, max(0.45, light)), min(1.0, sat * 1.3 + 0.1))
        picked.append(f"#{int(r2 * 255):02X}{int(g2 * 255):02X}{int(b2 * 255):02X}")
        if len(picked) == 2:
            break
    if not picked:
        return fallback
    if len(picked) == 1:
        picked.append(fallback[0])
    return picked[0], picked[1]
