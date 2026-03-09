import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from config import BOT_TOKEN
from storage import init_db
from handlers import auth, search, media, mylist, browse
from handlers import help, profile_extra, inline, findprofile
from notifier import notifier_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from aiogram import Router, F
from aiogram.types import Message

_fallback_router = Router()

@_fallback_router.message(F.text)
async def fallback_handler(msg: Message):
    from storage import get_lang
    lang = get_lang(msg.from_user.id)
    if lang == "ru":
        text = "🤔 Не понимаю эту команду\\.\nИспользуй /start для главного меню или /help для справки\\."
    else:
        text = "🤔 I don't understand that\\.\nUse /start for the main menu or /help for help\\."
    await msg.answer(text, parse_mode="MarkdownV2")


async def main():
    init_db()
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())

    dp.include_router(auth.router)
    dp.include_router(search.router)
    dp.include_router(media.router)
    dp.include_router(mylist.router)
    dp.include_router(browse.router)
    dp.include_router(help.router)
    dp.include_router(profile_extra.router)  # must be before inline (catches watching/card)
    dp.include_router(findprofile.router)
    dp.include_router(inline.router)
    dp.include_router(_fallback_router)  # must be last

    asyncio.create_task(notifier_loop(bot))
    logging.info("Bot started!")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())