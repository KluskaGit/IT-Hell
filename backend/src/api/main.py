from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from src.api.v1.router import router_v1
from src.core.exceptions import RecordNotFoundError, RecordAlreadyExistsError, ValidationError

app = FastAPI()

app.include_router(router_v1)

@app.get("/")
async def root():
    return {"message": "Welcome to the IT-Hell API!"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RecordNotFoundError)
async def not_found_exception_handler(request: Request, exc: RecordNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )

@app.exception_handler(RecordAlreadyExistsError)
async def already_exists_exception_handler(request: Request, exc: RecordAlreadyExistsError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )