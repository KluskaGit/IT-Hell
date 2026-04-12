import os
import redis.asyncio as aredis

from dotenv import load_dotenv

def redis_connect() -> aredis.Redis:
     
    load_dotenv()
    host = os.environ["REDIS_HOST"]
    port = int(os.environ["REDIS_PORT"])
    db = os.environ.get("REDIS_DB", 0)
    password = os.environ.get("REDIS_PASSWORD", None)
    
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