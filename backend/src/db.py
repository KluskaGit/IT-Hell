import os
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import AsyncEngine

from src.models import Base

def get_db_url() -> str:
    load_dotenv()

    user = os.environ['POSTGRES_USER']
    password = os.environ['POSTGRES_PASSWORD']
    host = os.environ['POSTGRES_HOST']
    port = os.environ['POSTGRES_PORT']
    db = os.environ['POSTGRES_DB']
    
    return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"

async def init_db(a_engine: AsyncEngine):
    async with a_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)