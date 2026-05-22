from typing import Annotated

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

from src.core.db import SessionDep

from src.repositories.users import UserRepository, UserProfileRepository
from src.repositories.lookups import LookupsRepository
from src.repositories.job_offers import JobOffersRepository

from src.services.auth_service import AuthService
from src.services.lookups_service import LookupsService
from src.services.job_offers_service import JobOffersService
from src.services.user_profiles_service import UserProfileService
from src.services.cv_service import CVService
from src.services.tech_extractor import TechExtractorService

from src.models.users import User




security_scheme = HTTPBearer()
optional_security_scheme = HTTPBearer(auto_error=False)

# Lookups

def get_lookups_repo(session: SessionDep) -> LookupsRepository:
    return LookupsRepository(session)

def get_lookups_service(lookups_repo: Annotated[LookupsRepository, Depends(get_lookups_repo)]) -> LookupsService:
    return LookupsService(lookups_repo)

def get_job_offers_repo(session: SessionDep) -> JobOffersRepository:
    return JobOffersRepository(session)

def get_job_offers_service(
    job_offers_repo: Annotated[JobOffersRepository, Depends(get_job_offers_repo)],
    lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]
) -> JobOffersService:
    return JobOffersService(job_offers_repo, lookups_service)

# Auth

def get_user_repo(session: SessionDep) -> UserRepository:
    return UserRepository(session)

def get_auth_service(user_repo: Annotated[UserRepository, Depends(get_user_repo)]) -> AuthService:
    return AuthService(user_repo)

def get_user_profile_repo(session: SessionDep) -> UserProfileRepository:
    return UserProfileRepository(session)

def get_user_profile_service(
    profile_repo: Annotated[UserProfileRepository, Depends(get_user_profile_repo)],
    lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]
) -> UserProfileService:
    return UserProfileService(profile_repo, lookups_service)

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    
    return await auth_service.authorize(credentials)

async def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(optional_security_scheme)],
    auth_service: AuthService = Depends(get_auth_service),
) -> User | None:
    
    if credentials:
       return await auth_service.authorize(credentials)
    else:
        return None

def get_tech_extractor_service(
    lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]
) -> TechExtractorService:
    return TechExtractorService(lookups_service)

def get_cv_service(
    tech_extractor_service: Annotated[TechExtractorService, Depends(get_tech_extractor_service)]
) -> CVService:
    return CVService(tech_extractor_service)