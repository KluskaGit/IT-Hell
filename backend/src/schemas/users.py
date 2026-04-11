import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field

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