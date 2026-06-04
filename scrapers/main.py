import argparse
import asyncio
import logging
import queue
import yaml

from typing import Protocol, Callable
from logging.handlers import QueueHandler, QueueListener

from src.pracuj_pl.scraper import ScraperPracujPL
from src.theprotocol_it.scraper import ScraperTheProtocolIT

class Scraper(Protocol):
    async def run(self) -> None:
        ...

def setup_logger(
        name: str,
    ) -> logging.Logger:

    log_que = queue.Queue()
    que_handler = QueueHandler(log_que)

    handler = logging.StreamHandler()   
    
    listener = QueueListener(log_que, handler)
    listener.start()
    
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.addHandler(que_handler)

    return logger

def get_config() -> dict:
    with open('app-config.yaml', 'r') as cfg:
        try:
            config = yaml.safe_load(cfg)
            return config
        except yaml.YAMLError as e:
            raise yaml.YAMLError(f"Error occured while reading the config file, {e}")

def setup_pracuj_pl() -> Scraper:
    logger_pracuj_pl = setup_logger("PracujPL")
    try:
        cfg = get_config()["pracuj_pl"]
    except KeyError as e:
        raise KeyError(f"Please specify pracuj_pl section, {e}")
    scraper_pracuj_pl = ScraperPracujPL(logger_pracuj_pl, cfg)

    return scraper_pracuj_pl

def setup_theprotocol() -> Scraper:
    logger_theprotocol = setup_logger("TheProtocolIT")
    try:
        cfg = get_config()["theprotocol_it"]
    except KeyError as e:
        raise KeyError(f"Please specify theprotocol_it section, {e}")
    scraper_theprtocol = ScraperTheProtocolIT(logger_theprotocol, cfg)

    return scraper_theprtocol

async def main(selected_scraper: str = "all"):
    tasks = []

    choice: dict[str, tuple[Callable[[], Scraper], ...]] = {
        "pracuj_pl": (setup_pracuj_pl,),
        "theprotocol_it": (setup_theprotocol,),
        "all": (setup_pracuj_pl, setup_theprotocol)
    }

    scrapers = choice.get(selected_scraper, ())
    
    for set_scraper in scrapers:
        scraper = set_scraper()
        tasks.append(asyncio.create_task(scraper.run()))

    if tasks:
        await asyncio.gather(*tasks)
    else:
        raise ValueError(f"No scrapers found matching: {selected_scraper}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run job scrapers.")
    parser.add_argument(
        "-s", "--scraper",
        choices=["pracuj_pl", "theprotocol_it", "all"],
        default="all",
        help="Specify which scraper to run (default: all)"
    )
    args = parser.parse_args()

    asyncio.run(main(args.scraper))