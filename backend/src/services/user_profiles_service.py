import uuid
from typing import Optional, List

from src.repositories.users import UserProfileRepository
from src.services.lookups_service import LookupsService
from src.models.users import UserProfile
from src.models.lookups import Technology
from src.schemas.users import UserProfileCreate, UserProfileUpdate
from src.core.exceptions import RecordNotFoundError, RecordAlreadyExistsError


class UserProfileService:
    def __init__(self, repo: UserProfileRepository, lookups_service: LookupsService):
        self.repo = repo
        self.lookups_service = lookups_service

    async def get_profile(self, user_id: uuid.UUID) -> UserProfile:
        profile = await self.repo.get_profile_by_user_id(user_id)
        if not profile:
            raise RecordNotFoundError("User profile not found")
        return profile

    async def create_profile(
        self, user_id: uuid.UUID, profile_data: UserProfileCreate
    ) -> UserProfile:
        existing_profile = await self.repo.get_profile_by_user_id(user_id)
        if existing_profile:
            raise RecordAlreadyExistsError("User profile already exists")

        technologies = []
        for tech_id in profile_data.technology_ids:
            # Używamy lookups_service do odnalezienia pełnych obiektów technologii po ich UUID
            tech = await self.lookups_service.get_by_id(Technology, str(tech_id))
            technologies.append(tech)

        return await self.repo.create_profile(
            user_id=user_id,
            raw_cv=profile_data.raw_cv,
            exp_level_id=profile_data.exp_level_id,
            technologies=technologies,
        )

    async def update_profile(
        self, user_id: uuid.UUID, profile_data: UserProfileUpdate
    ) -> UserProfile:
        existing_profile = await self.repo.get_profile_by_user_id(user_id)
        if not existing_profile:
            raise RecordNotFoundError("User profile not found")

        technologies = None
        if profile_data.technology_ids is not None:
            technologies = []
            for tech_id in profile_data.technology_ids:
                tech = await self.lookups_service.get_by_id(Technology, str(tech_id))
                technologies.append(tech)

        updated_profile = await self.repo.update_profile(
            user_id=user_id,
            raw_cv=profile_data.raw_cv,
            exp_level_id=profile_data.exp_level_id,
            technologies=technologies,
        )
        
        if updated_profile is None:
            raise RecordNotFoundError("User profile not found after update")
        return updated_profile

    async def update_cv(self, user_id: uuid.UUID, raw_cv: str, technologies: Optional[List[Technology]] = None) -> UserProfile:
        existing_profile = await self.repo.get_profile_by_user_id(user_id)
        if not existing_profile:
            raise RecordNotFoundError("User profile not found")

        # If no technologies provided, use empty list (maintain raw_cv only)
        tech_to_apply = technologies if technologies is not None else []

        # Update profile: replace all technologies with provided list
        updated_profile = await self.repo.update_profile(
            user_id=user_id,
            raw_cv=raw_cv,
            exp_level_id=None,
            technologies=tech_to_apply,
        )
        
        if updated_profile is None:
            raise RecordNotFoundError("User profile not found after update")
        return updated_profile

    async def update_cv_text_only(self, user_id: uuid.UUID, raw_cv: str) -> UserProfile:
        """
        Zapisuje TYLKO tekst CV bez zmiany technologii.
        Używane po wgraniu CV - technologie będą zatwierdzone osobno przez użytkownika.
        """
        existing_profile = await self.repo.get_profile_by_user_id(user_id)
        if not existing_profile:
            raise RecordNotFoundError("User profile not found")

        # Update ONLY raw_cv, leave technologies unchanged (technologies=None)
        updated_profile = await self.repo.update_profile(
            user_id=user_id,
            raw_cv=raw_cv,
            exp_level_id=None,
            technologies=None,  # Bez zmian technologii!
        )
        
        if updated_profile is None:
            raise RecordNotFoundError("User profile not found after update")
        return updated_profile

    async def delete_profile(self, user_id: uuid.UUID) -> None:
        success = await self.repo.delete_profile(user_id)
        if not success:
            raise RecordNotFoundError("User profile not found")