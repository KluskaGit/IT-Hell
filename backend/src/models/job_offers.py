import uuid

from datetime import datetime
from typing import List, TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    String,
    Text,
    Float,
    Uuid,
    Table,
    Column,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.lookups import ExperienceLevel
    from src.models.lookups import (
        Site,
        Company,
        WorkType,
        Location,
        Specialization,
        Technology,
    )


job_offer_location_table = Table(
    "job_offer_location",
    Base.metadata,
    Column("job_offer_id", ForeignKey("job_offers.id", ondelete="CASCADE"), primary_key=True),
    Column("location_id", ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True),
)

job_offer_technology_table = Table(
    "job_offer_technology",
    Base.metadata,
    Column("job_offer_id", ForeignKey("job_offers.id", ondelete="CASCADE"), primary_key=True),
    Column("technology_id", ForeignKey("technologies.id", ondelete="CASCADE"), primary_key=True),
)

class JobOffer(Base, TimestampMixin):
    __tablename__ = "job_offers"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"))
    exp_level_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experience_levels.id", ondelete="CASCADE"))
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))
    work_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("work_types.id", ondelete="CASCADE"))
    specialization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("specializations.id", ondelete="CASCADE"))

    salary_from: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_to: Mapped[float | None] = mapped_column(Float, nullable=True)
    url: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)

    publication_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expiration_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


    # Relationships
    site: Mapped["Site"] = relationship(back_populates="job_offers")
    exp_level: Mapped["ExperienceLevel"] = relationship(back_populates="job_offers")
    company: Mapped["Company"] = relationship(back_populates="job_offers")
    work_type: Mapped["WorkType"] = relationship(back_populates="job_offers")
    specialization: Mapped["Specialization"] = relationship(back_populates="job_offers")

    locations: Mapped[List["Location"]] = relationship(
        secondary="job_offer_location",
        back_populates="job_offers"
    )
    technologies: Mapped[List["Technology"]] = relationship(
        secondary="job_offer_technology",
        back_populates="job_offers"
    )
