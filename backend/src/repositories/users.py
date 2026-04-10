from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.users import (
    User,
    UserProfile,
)
from src.schemas.users import UserCreate


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        return user

    async def create_user(
        self,
        user: UserCreate
    ) -> User:
        
        new_user = User(
            id_keycloak=user.id_keycloak,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name
        )
        self.session.add(new_user)
        
        await self.session.commit()
        await self.session.refresh(new_user)
        
        return new_user