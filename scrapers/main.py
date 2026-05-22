import asyncio
import logging
import queue

from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener

from src.pracuj_pl.scraper import ScraperPracujPL
from src.theprotocol_it.scraper import ScraperTheProtocolIT


def setup_logger(
        name: str,
        max_bytes: int = 5*1024*1024,
        backup_count: int = 3
    ) -> logging.Logger:

    log_que = queue.Queue()
    que_handler = QueueHandler(log_que)

    handler = RotatingFileHandler(
        f'logs/{name}.log',
        maxBytes=max_bytes,         # 5 MB per file
        backupCount=backup_count    # Keep last 3 backups
    )   
    
    listener = QueueListener(log_que, handler)
    listener.start()
    
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.addHandler(que_handler)

    return logger


async def main():
    # Pracuj.pl
    tasks = []
    logger_pracuj_pl = setup_logger("PracujPL")
    scraper_pracuj_pl = ScraperPracujPL(logger_pracuj_pl)
    tasks.append(asyncio.create_task(scraper_pracuj_pl.run()))

    # TheProtocolIT
    logger_theprotocol = setup_logger("TheProtocolIT")
    scraper_theprtocol = ScraperTheProtocolIT(logger_theprotocol)
    tasks.append(asyncio.create_task(scraper_theprtocol.run()))

    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
    pass