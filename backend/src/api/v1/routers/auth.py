from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from src.services.auth_service import AuthService
from src.schemas.users import UserCreate, UserRead, Token
from src.api.v1.deps import get_auth_service

router = APIRouter(prefix="/auth", tags=["JWT Authentication"])


@router.post("/register", response_model=UserRead)
async def register(
    user: UserCreate,
    auth_service: Annotated[AuthService, Depends(get_auth_service)]
):
    return await auth_service.register_user(user)

@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    auth_service: Annotated[AuthService, Depends(get_auth_service)]

):
    return await auth_service.authenticate_user_jwt(form_data.username, form_data.password)


