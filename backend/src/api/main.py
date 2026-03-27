from fastapi import FastAPI
from src.api.v1.router import router_v1
app = FastAPI()

app.include_router(router_v1)

@app.get("/")
async def root():
    return {"message": "Welcome to the IT-Hell API!"}
