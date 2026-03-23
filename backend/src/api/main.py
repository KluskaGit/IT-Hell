from fastapi import FastAPI
from src.api.cv_router import router as cv_router

app = FastAPI()

app.include_router(cv_router)

@app.get("/")
async def root():
    return {"message": "Welcome to the IT-Hell API!"}
