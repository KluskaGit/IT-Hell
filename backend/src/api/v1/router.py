from fastapi import APIRouter
from src.api.v1.routers import lookups

router_v1 = APIRouter(prefix="/v1")
router_v1.include_router(lookups.router)


