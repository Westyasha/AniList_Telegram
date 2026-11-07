import asyncio
import logging
import signal

from app.bot.setup import configure_bot, create_bot, create_dispatcher
from app.config import Settings
from app.container import Container
from app.services.notifier import Notifier
from app.web.server import start_server

log = logging.getLogger("app")


def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    )
    logging.getLogger("aiogram.event").setLevel(logging.WARNING)
    logging.getLogger("aiohttp.access").setLevel(logging.WARNING)


async def run() -> None:
    settings = Settings()
    setup_logging(settings.log_level)
    container = Container.build(settings)
    await container.db.connect()
    await container.db.migrate(container.cipher, settings.legacy_database_path)
    await container.anilist.start()
    await container.renderer.start()

    bot = create_bot(settings.bot_token.get_secret_value())
    dispatcher = create_dispatcher(container)
    await configure_bot(bot, container)
    runner = await start_server(container, bot)
    notifier = Notifier(container, bot)
    notifier.start()

    total, linked = await container.users.stats()
    log.info("Starting polling: %d users, %d linked to AniList", total, linked)
    try:
        await dispatcher.start_polling(
            bot,
            allowed_updates=dispatcher.resolve_used_update_types(),
            handle_signals=False,
        )
    finally:
        await notifier.stop()
        await runner.cleanup()
        await container.renderer.close()
        await container.anilist.close()
        await container.db.close()
        await bot.session.close()


def main() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    task = loop.create_task(run())
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, task.cancel)
        except NotImplementedError:
            pass
    try:
        loop.run_until_complete(task)
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    finally:
        loop.close()


if __name__ == "__main__":
    main()
