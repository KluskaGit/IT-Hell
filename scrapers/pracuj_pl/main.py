import os
import json
import asyncio

from bs4 import BeautifulSoup
from curl_cffi import requests
from dotenv import load_dotenv
from typing import Dict

from pracuj_pl.core.redis import redis_connect
from pracuj_pl.lookups.lookups import extract_lookups

DATA_PATH = "pracuj_pl/data"

class ScraperPracujPL:

    def __init__(self):
        load_dotenv()
        self.redis_client = redis_connect()
        self.stream = os.environ["REDIS_STREAM"]


    def scraper_get(self):
        url = "https://it.pracuj.pl/praca?pn=1"
        headers = {"User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'}

        response = requests.get(url, headers=headers, impersonate="chrome110")
        with open(f"{DATA_PATH}/response.html", "w", encoding="utf-8") as f:
            f.write(response.text)

    def scraper_cache(self):
        with open(f"{DATA_PATH}/response.html", "r") as f:
            html = f.read()
        soup = BeautifulSoup(html, 'html.parser')
        next_data_script = soup.find('script', id='__NEXT_DATA__')
        if next_data_script:
            data = json.loads(next_data_script.string) # type: ignore
            with open(f"{DATA_PATH}/next_data.json", "w", encoding="utf-8") as out:
                json.dump(data, out, indent=4)

    def get_next_data(self) -> Dict:
        with open(f"{DATA_PATH}/next_data.json", "r") as f:
            data = f.read()
            next_data = json.loads(data)

        return next_data

    async def send_lookups(self) -> None:
        next_data = self.get_next_data()
        lookups = extract_lookups(next_data)
        await self.redis_client.xadd(self.stream, {"lookups": json.dumps(lookups)})

async def main():
    scraper = ScraperPracujPL()
    #scraper.scraper_get()
    #scraper.scraper_cache()
    await scraper.send_lookups()
    pass


if __name__ == "__main__":
    asyncio.run(main())