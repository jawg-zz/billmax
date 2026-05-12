import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MpesaTransaction(Base):
    __tablename__ = "mpesa_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    account_reference: Mapped[str | None] = mapped_column(String(100))
    transaction_id: Mapped[str | None] = mapped_column(String(100))
    conversation_id: Mapped[str | None] = mapped_column(String(100))
    originator_conversation_id: Mapped[str | None] = mapped_column(String(100))
    merchant_request_id: Mapped[str | None] = mapped_column(String(100))
    checkout_request_id: Mapped[str | None] = mapped_column(String(100))
    response_code: Mapped[str | None] = mapped_column(String(10))
    response_description: Mapped[str | None] = mapped_column(String(500))
    result_code: Mapped[str | None] = mapped_column(String(10))
    result_description: Mapped[str | None] = mapped_column(String(500))
    receipt_number: Mapped[str | None] = mapped_column(String(50))
    raw_request: Mapped[dict | None] = mapped_column(JSON)
    raw_callback: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id")
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization", back_populates="mpesa_transactions")
