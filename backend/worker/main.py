import os
import json
import asyncio
import redis.asyncio as aredis

from src.core.settings import settings
from worker.core.redis import redis_connect

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
                payload = json.loads(data["lookups"])
                
                if payload:
                    print(payload)

                await self.redis_client.xack(self.stream, self.group, message_id)

async def main() -> None:
    worker = Worker()
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())