import os
import redis.asyncio as aredis

from src.core.settings import settings

def redis_connect() -> aredis.Redis:

    host = settings.REDIS_HOST
    port = settings.REDIS_PORT
    db = settings.REDIS_DB
    password = settings.REDIS_PASSWORD
    
    try:
        client = aredis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True
        )
    except Exception as e:
        raise aredis.ConnectionError(e)

    return client