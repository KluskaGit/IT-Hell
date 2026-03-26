from fastapi import FastAPI
from src.api.v1.routers.cv import router as cv_router
from src.api.v1.router import router as lookups_router

from src.api.v1 import router
app = FastAPI()

app.include_router(router.router_v1)

@app.get("/")
async def root():
    return {"message": "Welcome to the IT-Hell API!"}
