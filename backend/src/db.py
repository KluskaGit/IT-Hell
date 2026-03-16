import os

from dotenv import load_dotenv
from typing import Annotated

from fastapi import Depends

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)

def get_db_url(asynchronous=False) -> str:
    load_dotenv()

    user = os.environ['POSTGRES_USER']
    password = os.environ['POSTGRES_PASSWORD']
    host = os.environ['POSTGRES_HOST']
    port = os.environ['POSTGRES_PORT']
    db = os.environ['POSTGRES_DB']

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