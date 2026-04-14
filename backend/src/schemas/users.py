import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from src.schemas.lookups import LookupRead

class UserBase(BaseModel):
    email: EmailStr

class UserRead(UserBase):
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    first_name: str | None
    last_name: str | None
    id_keycloak: uuid.UUID

class UserProfileBase(BaseModel):
    raw_cv: Optional[str] = None

class UserProfileCreate(UserProfileBase):
    exp_level_id: Optional[uuid.UUID] = None
    technology_ids: List[uuid.UUID] = Field(default_factory=list)

class UserProfileUpdate(UserProfileBase):
    exp_level_id: Optional[uuid.UUID] = None
    technology_ids: Optional[List[uuid.UUID]] = None

class UserProfileResponse(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    exp_level: Optional[LookupRead] = None
    technologies: List[LookupRead] = []

    model_config = ConfigDict(from_attributes=True)