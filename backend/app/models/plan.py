import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    download_speed_mbps: Mapped[int] = mapped_column(Integer, nullable=False)
    upload_speed_mbps: Mapped[int] = mapped_column(Integer, nullable=False)
    data_cap_gb: Mapped[int | None] = mapped_column(Integer)
    fup_threshold_gb: Mapped[int | None] = mapped_column(Integer)
    fup_speed_mbps: Mapped[int | None] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    setup_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    billing_cycle: Mapped[str] = mapped_column(
        String(20), default="monthly", nullable=False
    )
    is_taxable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization", back_populates="plans")
    subscriptions = relationship("Subscription", back_populates="plan")
