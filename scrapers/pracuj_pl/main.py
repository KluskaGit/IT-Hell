import json

from bs4 import BeautifulSoup
from curl_cffi import requests

DATA_PATH = "pracuj_pl/data"
def scraper_get():
    url = "https://it.pracuj.pl/praca?pn=1"
    headers = {"User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'}

    response = requests.get(url, headers=headers, impersonate="chrome110")
    with open(f"{DATA_PATH}/response.html", "w", encoding="utf-8") as f:
        f.write(response.text)

def scraper_cache():
    with open(f"{DATA_PATH}/response.html", "r") as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')
    next_data_script = soup.find('script', id='__NEXT_DATA__')
    if next_data_script:
        data = json.loads(next_data_script.string)
        with open(f"{DATA_PATH}/next_data.json", "w", encoding="utf-8") as out:
            json.dump(data, out, indent=4)

def main():
    #scraper_get()
    scraper_cache()
    pass


if __name__ == "__main__":
    main()
