from typing import Annotated
from fastapi import APIRouter, Depends, status, Body

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


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current logged-in user",
    responses={
        401: {"description": "Unauthorized (invalid or missing JWT token)"}
    }
)
async def get_user(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Returns basic information about the currently logged-in user.
    
    Requires a valid Keycloak JWT token in the **Authorization** header.
    """
    return current_user

@router.get(
    "/me/profile",
    response_model=UserProfileResponse,
    summary="Get user CV / Profile",
    responses={
        401: {"description": "Unauthorized"}
    }
)
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    user_profile_service: Annotated[UserProfileService, Depends(get_user_profile_service)]
):
    """
    Retrieves the extended user profile (experience level, assigned technologies).
    
    If the profile has not been created yet, a **404 Not Found** error is returned.
    """
    return await user_profile_service.get_profile(current_user.id_keycloak)

@router.put(
    "/me/profile",
    response_model=UserProfileResponse,
    summary="Create or update profile (UPSERT)",
    responses={
        401: {"description": "Unauthorized"},
        422: {"description": "Validation error of provided data (e.g., non-existent technology ID)"}
    }
)
async def update_my_profile(
    profile_data: Annotated[
        UserProfileUpdate,
        Body(
            openapi_examples={
                "typical_update": {
                    "summary": "Typical Profile Update",
                    "description": "An example payload to update user's experience level and technologies.",
                    "value": {
                        "raw_cv": "I am a backend developer with 3 years of experience...",
                        "exp_level_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "technology_ids": [
                            "123e4567-e89b-12d3-a456-426614174000"
                        ]
                    }
                }
            }
        )
    ],
    current_user: Annotated[User, Depends(get_current_user)],
    user_profile_service: Annotated[UserProfileService, Depends(get_user_profile_service)]
):
    """
    Used to update or create the user's profile (**UPSERT** mechanism):
    * Creates a new profile if it does not exist yet.
    * Overwrites profile data (including many-to-many technology relationships) if the profile already exists.
    """
    return await user_profile_service.update_profile(current_user.id_keycloak, profile_data)
