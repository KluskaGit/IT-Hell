import os

from dotenv import load_dotenv
from typing import Annotated

from fastapi import Depends

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)

from src.core.settings import settings

def get_db_url(asynchronous=False) -> str:
    load_dotenv()

    user = settings.POSTGRES_USER
    password = settings.POSTGRES_PASSWORD
    host = settings.POSTGRES_HOST
    port = settings.POSTGRES_PORT
    db = settings.POSTGRES_DB

    if asynchronous:
        return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"
    else:
        return f"postgresql://{user}:{password}@{host}:{port}/{db}"


a_engine = create_async_engine(get_db_url(asynchronous=True), echo=True)
a_sessionmaker = async_sessionmaker(a_engine, expire_on_commit=False)

async def get_session():
    async with a_sessionmaker() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]