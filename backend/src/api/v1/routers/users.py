from typing import Annotated
from fastapi import APIRouter, Depends, status

from src.schemas.users import (
    UserRead,
    UserProfileResponse,
    UserProfileCreate,
    UserProfileUpdate,
)
from src.api.v1.deps import get_current_user, get_user_profile_service
from src.services.user_profiles_service import UserProfileService
from src.models.users import User

router = APIRouter(prefix="/users", tags=["User"])


@router.get("/me", response_model=UserRead)
async def get_user(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

@router.get("/me/profile", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    user_profile_service: Annotated[UserProfileService, Depends(get_user_profile_service)]
):
    return await user_profile_service.get_profile(current_user.id_keycloak)

@router.post("/me/profile", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_my_profile(
    profile_data: UserProfileCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    user_profile_service: Annotated[UserProfileService, Depends(get_user_profile_service)]
):
    return await user_profile_service.create_profile(current_user.id_keycloak, profile_data)

@router.put("/me/profile", response_model=UserProfileResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    user_profile_service: Annotated[UserProfileService, Depends(get_user_profile_service)]
):
    return await user_profile_service.update_profile(current_user.id_keycloak, profile_data)

@router.delete("/me/profile", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    user_profile_service: Annotated[UserProfileService, Depends(get_user_profile_service)]
):
    await user_profile_service.delete_profile(current_user.id_keycloak)