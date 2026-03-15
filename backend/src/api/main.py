from typing import Annotated

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)

from src.db import get_db_url, init_db
a_engine = create_async_engine(get_db_url())
a_sessionmaker = async_sessionmaker(a_engine, expire_on_commit=False)

async def get_session():
    async with a_sessionmaker() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Before startup
    await init_db(a_engine=a_engine)
    yield
    # After startup

app = FastAPI(lifespan=lifespan)



@app.get("/")
async def root():
    return {"message": "Welcome to the IT-Hell API!"}
