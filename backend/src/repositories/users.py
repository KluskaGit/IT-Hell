from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from src.models.users import (
    User,
    UserProfile,
)

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        return user

    async def create_user(self, email: str, password: str) -> User:
        user = User(email=email, password=password)
        self.session.add(user)
        
        await self.session.commit()
        await self.session.refresh(user)
        
        return user