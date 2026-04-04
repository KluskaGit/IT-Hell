from typing import Annotated
from fastapi import APIRouter, Depends

from src.schemas.users import UserRead
from src.api.v1.deps import get_current_user

router = APIRouter(prefix="/users", tags=["User"])


@router.get("/me", response_model=UserRead)
async def get_user(current_user: Annotated[UserRead, Depends(get_current_user)]):
    return current_user