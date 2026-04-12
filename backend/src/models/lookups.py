import uuid

from typing import List, TYPE_CHECKING

from sqlalchemy import String, Uuid

from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base

if TYPE_CHECKING:
    from src.models.users import UserProfile
    from src.models.job_offers import JobOffer


class Lookup(Base):
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(50), unique=True)

class ExperienceLevel(Lookup):
    __tablename__ = "experience_levels"

    # Relationships
    user_profiles: Mapped[List["UserProfile"]] = relationship(back_populates="exp_level")
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="exp_level")

class Site(Lookup):
    __tablename__ = "sites"

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="site")

class Company(Lookup):
    __tablename__ = "companies"

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="company")

class WorkType(Lookup):
    __tablename__ = "work_types"

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="work_type")

class Location(Lookup):
    __tablename__ = "locations"

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(
        secondary="job_offer_location",
        back_populates="locations")

class Specialization(Lookup):
    __tablename__ = "specializations"

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="specialization")

class Technology(Lookup):
    __tablename__ = "technologies"

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(
        secondary="job_offer_technology",
        back_populates="technologies"
    )
    user_profiles: Mapped[List["UserProfile"]] = relationship(
        secondary="user_profile_technology",
        back_populates="technologies",
    )


