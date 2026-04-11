import uuid

from typing import List, TYPE_CHECKING

from sqlalchemy import String, Uuid

from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base

if TYPE_CHECKING:
    from src.models.users import UserProfile
    from src.models.job_offers import JobOffer

class ExperienceLevel(Base):
    __tablename__ = "experience_levels"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    exp_level: Mapped[str] = mapped_column(String(30), unique=True)

    # Relationships
    user_profiles: Mapped[List["UserProfile"]] = relationship(back_populates="exp_level")
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="exp_level")

class Site(Base):
    __tablename__ = "sites"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    url: Mapped[str] = mapped_column(String(250), unique=True)

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="site")

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    company_name: Mapped[str] = mapped_column(String(50), unique=True)

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="company")

class WorkType(Base):
    __tablename__ = "work_types"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    work_type: Mapped[str] = mapped_column(String(50), unique=True)

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="work_type")

class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    city: Mapped[str] = mapped_column(String(50), unique=True)

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(
        secondary="job_offer_location",
        back_populates="locations")

class Specialization(Base):
    __tablename__ = "specializations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    specialization: Mapped[str] = mapped_column(String(50), unique=True)

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(back_populates="specialization")

class Technology(Base):
    __tablename__ = "technologies"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    technologies: Mapped[str] = mapped_column(String(50), unique=True)

    # Relationships
    job_offers: Mapped[List["JobOffer"]] = relationship(
        secondary="job_offer_technology",
        back_populates="technologies"
    )
    user_profiles: Mapped[List["UserProfile"]] = relationship(
        secondary="user_profile_technology",
        back_populates="technologies",
    )


