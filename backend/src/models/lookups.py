import uuid

from typing import List

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID

from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base
#from src.models.users import UserProfile

class ExperienceLevel(Base):
    __tablename__ = "experience_levels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    exp_level: Mapped[str] = mapped_column(String(30))

    # Relationships
    user_profiles: Mapped[List["UserProfile"]] = relationship(back_populates="exp_level")