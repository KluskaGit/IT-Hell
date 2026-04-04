import jwt
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from typing import Dict, Any

from src.repositories.users import UserRepository
from src.core.security import hash_password, verify_password
from src.schemas.users import UserCreate
from src.models.users import User

from src.core.settings import settings

from src.schemas.users import Token

class AuthService:

    def __init__(self, user_repository: UserRepository):
        self.user_repo = user_repository

    async def register_user(self, user: UserCreate) -> User:
        existing_user = await self.user_repo.get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = hash_password(user.password)
        new_user = await self.user_repo.create_user(user.email, hashed_password)
        return new_user
    
    def _create_jwt_token(self, payload: Dict[str, Any], expires_delta: timedelta) -> str:
        to_encode = payload.copy()
        expire = datetime.now(timezone.utc) + expires_delta

        to_encode.update({"exp": expire})
        
        token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

        return token
    
    async def validate_token(self, token: str) -> User:
        credential_exception = HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            email = payload.get("sub")
            if not email:
                raise credential_exception
        except jwt.PyJWTError:
            raise credential_exception
        
        user = await self.user_repo.get_user_by_email(email)

        if user is None:
            raise credential_exception
        
        return user


    
    async def authenticate_user_jwt(self, email: str, password: str) -> Token:
        user = await self.user_repo.get_user_by_email(email)
        if not user or not verify_password(password, user.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self._create_jwt_token(
            payload={"sub": user.email},
            expires_delta=access_token_expires
        )

        return Token(access_token=access_token, token_type="bearer")


        