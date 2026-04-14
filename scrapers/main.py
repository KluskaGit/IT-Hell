import asyncio
import logging
import queue

from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener

from pracuj_pl.scraper import ScraperPracujPL


async def main():

    # Logger
    log_que = queue.Queue()
    que_handler = QueueHandler(log_que)
    
    handler = RotatingFileHandler(
        'Scrapers.log',
        maxBytes=5*1024*1024,  # 5 MB per file
        backupCount=3          # Keep last 3 backups
    )
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)

    listener = QueueListener(log_que, handler)
    listener.start()

    logger = logging.getLogger("TradeitScraper")
    logger.setLevel(logging.INFO)
    logger.addHandler(que_handler)

    # Pracuj.pl
    scraper_pracuj_pl = ScraperPracujPL(logger)
    await scraper_pracuj_pl.run()

if __name__ == "__main__":
    asyncio.run(main())
    pass