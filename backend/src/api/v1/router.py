from fastapi import APIRouter
from src.api.v1.routers import lookups, cv, users

router_v1 = APIRouter(prefix="/v1")
router_v1.include_router(lookups.router)
router_v1.include_router(cv.router)
router_v1.include_router(users.router)

