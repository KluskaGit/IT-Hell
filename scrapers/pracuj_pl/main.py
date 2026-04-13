import os
import json
import asyncio
import logging
import queue
import random

from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener

from dotenv import load_dotenv
from typing import Dict

from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession
from logging import Logger


from pracuj_pl.core.redis import redis_connect
from pracuj_pl.job_offers.job_offers import extract_job_offers, fill_out_offer
from pracuj_pl.schemas import JobOffer

DATA_PATH = "pracuj_pl/data"

class ScraperPracujPL:

    def __init__(self, logger: Logger):
        self.logger = logger
        self.min_delay = 7
        self.max_delay = 7

        load_dotenv()
        self.redis_client = redis_connect()
        self.stream = os.environ["REDIS_STREAM"]
        self.job_que: asyncio.Queue[JobOffer] = asyncio.Queue()
        self.redis_que: asyncio.Queue[JobOffer] = asyncio.Queue()

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
        
        await asyncio.sleep(random.uniform(self.min_delay, self.max_delay))

        return self.html_to_json(response.text)

    async def redis_worker(self):
        while True:
            offer = await self.redis_que.get()
            try:
                await self.redis_client.xadd(self.stream, {"offer": offer.model_dump_json()})
            except Exception as e:
                self.logger.error(f"Error while pushing to Redis: {e}")
            finally:
                self.redis_que.task_done()

    async def worker(self, session: AsyncSession):
        while True:
            
            offer = await self.job_que.get()
            try:    
                next_data = await self.fetch(session, offer.url)
                if next_data is not None:
                    # Parsowanie detali i przypisanie do glownego obiektu
                    fill_out_offer(next_data, offer)
                
                print(offer)
                await self.redis_que.put(offer)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error while fetching item: {e}")
            finally:
                self.job_que.task_done()

    async def run(self) -> None:
        headers = {"User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'}

        async with AsyncSession(headers=headers, impersonate="chrome110") as session:
            num_workers = 2
            
            # Startujemy workery
            workers = [asyncio.create_task(self.worker(session)) for _ in range(num_workers)]
            workers.append(asyncio.create_task(self.redis_worker()))

            page = 1
            while True:
                url = f"https://it.pracuj.pl/praca?pn={page}"
                
                try:
                    next_data = await self.fetch(session, url)
                except Exception as e:
                    self.logger.error(f"Error fetching page {page}: {e}")
                    break
                
                if next_data is None:
                    break

                try:
                    offers = extract_job_offers(next_data)
                    if not offers:
                        self.logger.info(f"0 offers on page {page}. Stopping pagination.")
                        break

                    for offer in offers:
                        await self.job_que.put(offer)
                except Exception as e:
                    self.logger.error(f"Failed to extract offers on page {page}: {e}")
                    break
                
                page += 1
                break

            self.logger.info("Finished putting pages in queue. Waiting for workers to finish.")
            await self.job_que.join()
            await self.redis_que.join()

            self.logger.info("All tasks completed, canceling workers.")
            for w in workers:
                w.cancel()

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
    await scraper.run()

if __name__ == "__main__":
    asyncio.run(main())
    pass