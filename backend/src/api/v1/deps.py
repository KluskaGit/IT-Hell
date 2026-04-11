from typing import Annotated

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

from src.core.db import SessionDep
from src.models.users import User
from src.repositories.users import UserRepository
from src.services.auth_service import AuthService


security_scheme = HTTPBearer()

def get_user_repo(session: SessionDep) -> UserRepository:
    return UserRepository(session)

def get_auth_service(user_repo: UserRepository = Depends(get_user_repo)) -> AuthService:
    return AuthService(user_repo)

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    
    return await auth_service.authorize(credentials)