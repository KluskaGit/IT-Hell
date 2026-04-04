import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr

class UserRead(UserBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class Token(BaseModel):
    access_token: str
    token_type: str