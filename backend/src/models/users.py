import uuid

from typing import Dict, TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text, Boolean, Uuid, JSON

from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.lookups import ExperienceLevel


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
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id_keycloak"))
    exp_level_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experience_levels.id"))
    skills: Mapped[Dict] = mapped_column(JSON)
    raw_cv: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="user_profile")
    exp_level: Mapped["ExperienceLevel"] = relationship(back_populates="user_profiles")