import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from config import BOT_TOKEN
from storage import init_db
from handlers import auth, search, media, mylist, browse
from handlers import help, inline
from notifier import notifier_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

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
    dp.include_router(inline.router)

    asyncio.create_task(notifier_loop(bot))

    logging.info("Bot started!")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
