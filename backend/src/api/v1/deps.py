from typing import Annotated

from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends

from src.core.db import SessionDep
from src.repositories.users import UserRepository
from src.services.auth_service import AuthService
from src.models.users import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")

def get_user_repo(session: SessionDep) -> UserRepository:
    return UserRepository(session)

def get_auth_service(user_repo: UserRepository = Depends(get_user_repo)) -> AuthService:
    return AuthService(user_repo)

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    
    return await auth_service.validate_token(token)