import hashlib
import logging
from contextlib import suppress
from typing import Any

from aiogram import Router
from aiogram.exceptions import TelegramAPIError
from aiogram.types import (
    BufferedInputFile,
    InlineQuery,
    InlineQueryResultArticle,
    InlineQueryResultCachedPhoto,
    InlineQueryResultsButton,
    InputTextMessageContent,
    LinkPreviewOptions,
)

from app.anilist import helpers
from app.anilist import queries as q
from app.bot.context import Ctx
from app.bot.screens.library import load_collection
from app.bot.screens.media import media_text
from app.bot.ui import Kb, b, h, url_btn
from app.bot.views import duration, media_format
from app.services.cards import cards

router = Router(name="inline")
log = logging.getLogger(__name__)


def _rid(*parts: Any) -> str:
    return hashlib.blake2b(":".join(map(str, parts)).encode(), digest_size=16).hexdigest()


def _bot_link(ctx: Ctx, payload: str) -> str:
    return f"https://t.me/{ctx.app.bot_username}?start={payload}"


def _media_result(ctx: Ctx, media: dict[str, Any]) -> InlineQueryResultArticle:
    _ = ctx._
    year = media.get("seasonYear") or (media.get("startDate") or {}).get("year") or ""
    score = f"★ {media['averageScore']}%" if media.get("averageScore") else ""
    description = " · ".join(str(p) for p in [media_format(ctx, media.get("format")), year, score] if p)
    genres = ", ".join((media.get("genres") or [])[:3])
    if genres:
        description += f"\n{genres}"
    kb = Kb().row(
        url_btn(_("inline.open_bot"), _bot_link(ctx, f"m_{media['id']}")),
        url_btn("AniList ↗", f"https://anilist.co/{(media.get('type') or 'anime').lower()}/{media['id']}"),
    )
    return InlineQueryResultArticle(
        id=_rid("m", media["id"], ctx.lang),
        title=ctx.title(media),
        description=description,
        thumbnail_url=helpers.cover(media, "medium"),
        input_message_content=InputTextMessageContent(
            message_text=media_text(ctx, media, description_limit=500),
            link_preview_options=LinkPreviewOptions(
                url=helpers.hero_image(media), prefer_large_media=True, show_above_text=True
            ),
        ),
        reply_markup=kb.build(),
    )


async def _search(ctx: Ctx, text: str, offset: int) -> tuple[list[Any], str]:
    media_type = "ANIME"
    if text.lower().startswith(("m ", "manga ")):
        media_type = "MANGA"
        text = text.split(" ", 1)[1]
    page = offset + 1
    data = await ctx.gql(
        q.SEARCH_MEDIA,
        {"search": text, "type": media_type, "page": page, "perPage": 15, "sort": ["SEARCH_MATCH"]},
        ttl=300,
    )
    block = data.get("Page") or {}
    results = [_media_result(ctx, m) for m in block.get("media") or []]
    next_offset = str(page) if (block.get("pageInfo") or {}).get("hasNextPage") and page < 5 else ""
    return results, next_offset


async def _by_id(ctx: Ctx, media_id: int) -> list[Any]:
    data = await ctx.gql(q.MEDIA, {"id": media_id}, ttl=300)
    media = data.get("Media")
    return [_media_result(ctx, media)] if media else []


async def _watching(ctx: Ctx) -> list[Any]:
    _ = ctx._
    entries = [e for e in await load_collection(ctx, "ANIME") if e["status"] in ("CURRENT", "REPEATING")]
    results = []
    for entry in entries[:20]:
        media = entry["media"]
        total = media.get("episodes") or "?"
        lines = [
            _("inline.watching_head", name=b(ctx.user.anilist_name or "")),
            f"<b>{h(ctx.title(media))}</b>",
            _("inline.progress", cur=entry.get("progress") or 0, total=total),
        ]
        nxt = media.get("nextAiringEpisode")
        if nxt:
            lines.append(_("media.next", ep=nxt["episode"], time=duration(ctx, nxt["timeUntilAiring"])))
        results.append(
            InlineQueryResultArticle(
                id=_rid("w", media["id"], ctx.user.user_id),
                title=ctx.title(media),
                description=_("inline.progress", cur=entry.get("progress") or 0, total=total),
                thumbnail_url=helpers.cover(media, "medium"),
                input_message_content=InputTextMessageContent(
                    message_text="\n".join(lines),
                    link_preview_options=LinkPreviewOptions(
                        url=helpers.hero_image(media), prefer_large_media=True, show_above_text=True
                    ),
                ),
                reply_markup=Kb().row(url_btn(_("inline.open_bot"), _bot_link(ctx, f"m_{media['id']}"))).build(),
            )
        )
    return results


async def _card(ctx: Ctx, name: str) -> list[Any]:
    _ = ctx._
    user = await cards.fetch_card_user(ctx.app.anilist, name, ctx.user.token if ctx.user.authorized else None)
    if not user:
        return []
    payload = cards.card_payload(user)
    key = cards.digest([payload, ctx.lang])
    kind = f"card:{user['id']}"
    file_id = await ctx.app.images.get(ctx.user.user_id, kind, key, 6 * 3600)
    if not file_id:
        image = await cards.render_profile_card(ctx.app.renderer, payload, ctx.lang, ctx.app.bot_username)
        try:
            message = await ctx.bot.send_photo(
                ctx.user.user_id,
                BufferedInputFile(image, "card.jpg"),
                caption=_("inline.card_cached"),
                disable_notification=True,
            )
        except TelegramAPIError:
            return []
        if not message.photo:
            return []
        file_id = message.photo[-1].file_id
        await ctx.app.images.set(ctx.user.user_id, kind, key, file_id)
        with suppress(TelegramAPIError):
            await message.delete()
    caption = _("card.caption", anime=b(payload["anime_count"]), days=b(payload["days"]), score=b(payload["score"]))
    return [
        InlineQueryResultCachedPhoto(
            id=_rid("c", user["id"], key),
            photo_file_id=file_id,
            title=_("inline.card_title", name=user["name"]),
            caption=f"🪪 <b>{h(user['name'])}</b>\n{caption}",
            reply_markup=Kb().row(url_btn("AniList ↗", f"https://anilist.co/user/{user['name']}")).build(),
        )
    ]


def _hints(ctx: Ctx) -> list[Any]:
    _ = ctx._
    items = [("search", "inline.hint_search"), ("watching", "inline.hint_watching"), ("card", "inline.hint_card")]
    return [
        InlineQueryResultArticle(
            id=f"hint-{key}",
            title=_(f"{text}_title"),
            description=_(f"{text}_desc"),
            input_message_content=InputTextMessageContent(message_text=_(f"{text}_message", bot=ctx.app.bot_username)),
        )
        for key, text in items
    ]


@router.inline_query()
async def on_inline(query: InlineQuery, ctx: Ctx) -> None:
    _ = ctx._
    text = query.query.strip()
    lower = text.lower()
    offset = int(query.offset) if query.offset.isdigit() else 0
    login_button = InlineQueryResultsButton(text=_("inline.login"), start_parameter="login")
    results: list[Any] = []
    next_offset = ""
    personal = False
    if not text:
        results = _hints(ctx)
        personal = True
    elif lower.startswith("id:") and lower[3:].isdigit():
        results = await _by_id(ctx, int(lower[3:]))
    elif lower in ("watching", "w", "смотрю"):
        if not ctx.user.authorized:
            await query.answer([], button=login_button, cache_time=5, is_personal=True)
            return
        results = await _watching(ctx)
        personal = True
    elif lower.startswith(("card", "карточка")):
        parts = text.split(maxsplit=1)
        name = parts[1] if len(parts) > 1 else ctx.user.anilist_name
        if not name:
            await query.answer([], button=login_button, cache_time=5, is_personal=True)
            return
        results = await _card(ctx, name.strip()[:40])
        personal = True
    elif len(text) >= 2:
        results, next_offset = await _search(ctx, text, offset)
    await query.answer(
        results[:50],
        cache_time=30 if not personal else 5,
        is_personal=personal,
        next_offset=next_offset,
    )
