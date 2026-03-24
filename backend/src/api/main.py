from fastapi import FastAPI
from src.api.routers.cv import router as cv_router
from src.api.routers.lookups import router as lookups_router

app = FastAPI()

app.include_router(cv_router)
app.include_router(lookups_router)

@app.get("/")
async def root():
    return {"message": "Welcome to the IT-Hell API!"}
