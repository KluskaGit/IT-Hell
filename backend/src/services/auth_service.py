from fastapi import HTTPException

from repositories.users import UserRepository
from src.core.security import hash_password
from src.schemas.users import UserCreate
from src.models.users import User


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
    
    async def authenticate_user(self, email: str, password: str):
        pass