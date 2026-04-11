import uuid

from typing import List, TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    String,
    Text,
    Boolean,
    Uuid,
    Table,
    Column,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.lookups import ExperienceLevel, Technology



user_profile_technologies_table = Table(
    "user_profile_technology",
    Base.metadata,
    Column("user_profile_id", ForeignKey("user_profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("technology_id", ForeignKey("technologies.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id_keycloak: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )
    email: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)



    # Relationships
    user_profile: Mapped["UserProfile"] = relationship(
        back_populates="user",
        uselist=False
    )

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id_keycloak", ondelete="CASCADE"),)
    exp_level_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experience_levels.id", ondelete="CASCADE"))
    raw_cv: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="user_profile")
    exp_level: Mapped["ExperienceLevel"] = relationship(back_populates="user_profiles")

    technologies: Mapped[List["Technology"]] = relationship(
        secondary="user_profile_technology",
        back_populates="user_profiles"
    )


