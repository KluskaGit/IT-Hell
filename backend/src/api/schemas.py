from pydantic import BaseModel
from uuid import UUID

class WorkTypeSchema(BaseModel):
    id: UUID
    work_type: str

    class Config:
        from_attributes = True