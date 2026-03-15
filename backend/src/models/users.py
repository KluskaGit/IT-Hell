import uuid

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base, TimestampMixin
#from src.models.lookups import ExperienceLevel


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(30))
    password: Mapped[str] = mapped_column(String(500))

    # Relationships
    user_profile: Mapped["UserProfile"] = relationship(
        back_populates="user",
        uselist=False
    )

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    exp_level_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experience_levels.id"))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="user_profile")
    exp_level: Mapped["ExperienceLevel"] = relationship(back_populates="user_profiles")