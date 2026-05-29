import os
import json
import asyncio
import random

from typing import Dict
from dotenv import load_dotenv
from logging import Logger

from curl_cffi.requests import AsyncSession

from src.schemas import JobOffer
from src.helpers import html_to_json
from src.core.redis import redis_connect
from src.theprotocol_it.offers import extract_job_offers, fill_out_offer

class ScraperTheProtocolIT:

    def __init__(self, logger: Logger, config: Dict):

        self.logger = logger

        try:
            self.min_delay = config["min_delay"]
            self.max_delay = config["max_delay"]
            self.page_limit = config["pages"]
        except KeyError as e:
            raise KeyError(f"Please specify min_delay, max_delay and pages, {e}")
        
        load_dotenv()
        self.redis_client = redis_connect()
        self.stream = os.environ["REDIS_STREAM"]
        self.job_que: asyncio.Queue[JobOffer] = asyncio.Queue()
        self.redis_que: asyncio.Queue[JobOffer] = asyncio.Queue()

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
        
        return html_to_json(response.text)
    

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
                # with open(f"{DATA_PATH}/next_data2.json", "w", encoding="utf-8") as f:
                #     f.write(json.dumps(next_data, ensure_ascii=False, indent=4))
                    #next_data = json.loads(f.read())
                if next_data is not None:
                    fill_out_offer(next_data, offer)
                
                print(offer)
                await self.redis_que.put(offer)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error while fetching item: {e}, {offer}")
            finally:
                self.job_que.task_done()



    async def run(self) -> None:
        headers = {"User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'}

        async with AsyncSession(headers=headers, impersonate="chrome110") as session:
            num_workers = 2
            
            workers = [asyncio.create_task(self.worker(session)) for _ in range(num_workers)]
            workers.append(asyncio.create_task(self.redis_worker()))

            page = 1
            while True:
                url = f"https://theprotocol.it/praca?pageNumber={page}"
                
                try:
                    next_data = await self.fetch(session, url)
                    # with open(f"{DATA_PATH}/next_data.json", "r", encoding="utf-8") as f:
                    #     next_data = json.loads(f.read())
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
                        #break
                except Exception as e:
                    self.logger.error(f"Failed to extract offers on page {page}: {e}")
                    break
                
                if page >= self.page_limit:
                    break
                page += 1
                

            self.logger.info("Finished putting pages in queue. Waiting for workers to finish.")
            await self.job_que.join()
            await self.redis_que.join()

            self.logger.info("All tasks completed, canceling workers.")
            for w in workers:
                w.cancel()