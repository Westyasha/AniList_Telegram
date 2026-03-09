import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from config import BOT_TOKEN
from handlers import auth, search, media, mylist, browse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

async def main():
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())

    dp.include_router(auth.router)
    dp.include_router(search.router)
    dp.include_router(media.router)
    dp.include_router(mylist.router)
    dp.include_router(browse.router)

    logging.info("Bot started!")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
