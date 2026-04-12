from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.api.v1 import router
from src.core.exceptions import RecordNotFoundError, RecordAlreadyExistsError

app = FastAPI()

app.include_router(router.router_v1)

@app.get("/")
async def root():
    return {"message": "Welcome to the IT-Hell API!"}

@app.exception_handler(RecordNotFoundError)
async def not_found_exception_handler(request: Request, exc: RecordNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
    )

@app.exception_handler(RecordAlreadyExistsError)
async def already_exists_exception_handler(request: Request, exc: RecordAlreadyExistsError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )