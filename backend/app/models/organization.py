import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kra_pin: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    users = relationship("User", back_populates="organization")
    customers = relationship("Customer", back_populates="organization")
    plans = relationship("Plan", back_populates="organization")
    subscriptions = relationship("Subscription", back_populates="organization")
    invoices = relationship("Invoice", back_populates="organization")
    payments = relationship("Payment", back_populates="organization")
    mpesa_transactions = relationship("MpesaTransaction", back_populates="organization")
    tickets = relationship("Ticket", back_populates="organization")
    notifications = relationship("Notification", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    cpe_devices = relationship("CpeDevice", back_populates="organization")
    inventory_items = relationship("InventoryItem", back_populates="organization")
