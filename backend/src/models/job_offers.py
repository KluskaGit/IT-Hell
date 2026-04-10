import uuid

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text, Float, Uuid
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

class JobOffer(Base, TimestampMixin):
    __tablename__ = "job_offers"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id"))
    exp_level_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experience_levels.id"))
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    work_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("work_types.id"))
    location_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("locations.id"))
    specialization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("specializations.id"))
    technology_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("technologies.id"))

    salary_from: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_to: Mapped[float | None] = mapped_column(Float, nullable=True)
    url: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)

    # Relationships
    site: Mapped["Site"] = relationship(back_populates="job_offers")
    exp_level: Mapped["ExperienceLevel"] = relationship(back_populates="job_offers")
    company: Mapped["Company"] = relationship(back_populates="job_offers")
    work_type: Mapped["WorkType"] = relationship(back_populates="job_offers")
    location: Mapped["Location"] = relationship(back_populates="job_offers")
    specialization: Mapped["Specialization"] = relationship(back_populates="job_offers")
    technologies: Mapped["Technology"] = relationship(back_populates="job_offers")