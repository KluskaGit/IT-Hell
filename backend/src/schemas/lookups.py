import uuid
from pydantic import BaseModel, ConfigDict

class ExperienceLevelRead(BaseModel):
    id: uuid.UUID
    exp_level: str

    model_config = ConfigDict(from_attributes=True)

class WorkTypeRead(BaseModel):
    id: uuid.UUID
    work_type: str

    model_config = ConfigDict(from_attributes=True)