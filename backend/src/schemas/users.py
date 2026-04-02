import uuid
from pydantic import BaseModel, ConfigDict, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserRead(UserBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: str