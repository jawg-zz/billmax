import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SequenceNumber(Base):
    __tablename__ = "sequence_numbers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    prefix: Mapped[str] = mapped_column(String(10), nullable=False)
    last_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "prefix", "year", name="uq_seq_per_org_year"),
    )
