import os
import json
import asyncio
import logging
import queue

from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener

from dotenv import load_dotenv
from typing import Dict

from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession
from logging import Logger


from pracuj_pl.core.redis import redis_connect
from pracuj_pl.lookups.lookups import extract_lookups
from pracuj_pl.job_offers.job_offers import extract_job_offers

DATA_PATH = "pracuj_pl/data"

class ScraperPracujPL:

    def __init__(self, logger: Logger):
        self.logger = logger

        load_dotenv()
        self.redis_client = redis_connect()
        self.stream = os.environ["REDIS_STREAM"]

    def html_to_json(self, text: str) -> Dict | None:
        try:
            html = text
            soup = BeautifulSoup(html, 'html.parser')
            next_data_script = soup.find('script', id='__NEXT_DATA__')
            if next_data_script:
                return json.loads(next_data_script.string) # type: ignore
            return None
        
        except Exception as e:
            raise

    async def fetch(self, session: AsyncSession, url: str) -> Dict | None:
        response = await session.get(url)
        self.logger.info(f"{response.status_code} fetching {url}")
        if response.status_code != 200:
            text = response.content
            self.logger.error(f"{response.status_code} Unexpected satatus code! \n Error message: {text}")

            loop = asyncio.get_running_loop()
            loop.stop()
            raise RuntimeError(f"Fetch failed with status {response.status_code}: {text}")
        
        # await asyncio.sleep(random.uniform(self.min_delay, self.max_delay))

        return self.html_to_json(response.text)

    def get_next_data(self, path: str) -> Dict:
        with open(path, "r", encoding="utf-8") as f:
            data = f.read()
            next_data = json.loads(data)

        return next_data

    async def send_lookups(self) -> None:
        path = f"{DATA_PATH}/next_data.json"
        next_data = self.get_next_data(path)
        lookups = extract_lookups(next_data)
        await self.redis_client.xadd(self.stream, {"lookups": json.dumps(lookups)})

    async def run(self):
        headers = {"User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'}

        async with AsyncSession(headers=headers, impersonate="chrome110") as session:
            # url = "https://www.pracuj.pl/praca/administrator-sieci-warszawa-marszalkowska-58,oferta,1004748640"
            # next_data = await self.fetch(session, url)
            next_data = self.get_next_data(f"{DATA_PATH}/next_data.json")
            return next_data

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

    scraper = ScraperPracujPL(logger)
    # scraper.scraper_get()
    # scraper.scraper_cache()
    #await scraper.send_lookups()
    # next_data = await scraper.run()
    # with open(f"{DATA_PATH}/next_data2.json", "w", encoding="utf-8") as out:
    #     json.dump(next_data, out, indent=4)
    path= f"{DATA_PATH}/next_data.json"
    extract_job_offers(scraper.get_next_data(path))
    pass


if __name__ == "__main__":
    asyncio.run(main())