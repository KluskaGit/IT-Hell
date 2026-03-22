from datetime import datetime

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func

class Base(DeclarativeBase):
    pass

class TimestampMixin:

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

# Import all models here to ensure they are registered with SQLAlchemy's metadata
from src.models.users import User, UserProfile
from src.models.lookups import ExperienceLevel

# Meybe we need also these models?
from src.models.lookups import Site, Company, WorkType, Location
from src.models.job_offers import JobOffer