import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.models.users import (
    User,
    UserProfile,
)
from src.models.lookups import Technology
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

class UserProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_profile_by_user_id(self, user_id: uuid.UUID) -> UserProfile | None:
        stmt = (
            select(UserProfile)
            .where(UserProfile.user_id == user_id)
            .options(
                selectinload(UserProfile.exp_level),
                selectinload(UserProfile.technologies)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_profile(
        self,
        user_id: uuid.UUID,
        raw_cv: str | None = None,
        exp_level_id: uuid.UUID | None = None,
        technologies: List[Technology] | None = None
    ) -> UserProfile:
        if technologies is None:
            technologies = []
            
        new_profile = UserProfile(
            user_id=user_id,
            raw_cv=raw_cv,
            exp_level_id=exp_level_id
        )
        self.session.add(new_profile)
        new_profile.technologies = technologies
        
        await self.session.commit()
        profile = await self.get_profile_by_user_id(user_id)
        if profile is None:
            raise RuntimeError("Failed to retrieve created user profile")
        return profile

    async def update_profile(
        self,
        user_id: uuid.UUID,
        raw_cv: str | None = None,
        exp_level_id: uuid.UUID | None = None,
        technologies: List[Technology] | None = None
    ) -> UserProfile | None:
        profile = await self.get_profile_by_user_id(user_id)
        if not profile:
            return None
            
        if raw_cv is not None:
            profile.raw_cv = raw_cv
        if exp_level_id is not None:
            profile.exp_level_id = exp_level_id
        if technologies is not None:
            profile.technologies = technologies
            
        await self.session.commit()
        await self.session.refresh(profile)
        return profile

