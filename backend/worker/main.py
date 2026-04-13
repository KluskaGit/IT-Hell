from codecs import lookup
import os
import json
import asyncio
import redis.asyncio as aredis

from worker.core.redis import redis_connect
from worker.lookups import save_lookups_to_db
from worker.job_offers import save_job_offer_to_db

from src.core.settings import settings
from src.core.db import a_sessionmaker


class Worker:
    def __init__(self) -> None:
        self.redis_client = redis_connect()

        self.stream = settings.REDIS_STREAM
        self.group = settings.REDIS_GROUP
        self.consumer = settings.REDIS_CONSUMER

    async def init_redis(self) -> None:
        try:
            await self.redis_client.xgroup_create(
                name=self.stream,
                groupname=self.group,
                id="0",
                mkstream=True
            )
        except aredis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise
            else:
                pass

    async def run(self) -> None:
        await self.init_redis()

        while True:
            message = await self.redis_client.xreadgroup(
                groupname=self.group,
                consumername=self.consumer,
                streams={self.stream: ">"},
                count=1,
                block=10000
            )
            
            if message:
                message_id, data =  message[0][1][0]
                # lookups = data.get("lookups", None)

                # if lookups:
                #     payload = json.loads(lookups)
                    
                #     if payload:
                #         await save_lookups_to_db(payload)
                offer = data.get("offer", None)
                if offer:
                    payload = json.loads(offer)
                    
                    await save_job_offer_to_db(payload)


                await self.redis_client.xack(self.stream, self.group, message_id)

async def main() -> None:
    worker = Worker()
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())