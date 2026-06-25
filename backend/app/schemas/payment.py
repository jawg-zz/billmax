import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    customer_id: uuid.UUID
    invoice_id: uuid.UUID | None = None
    amount: float
    payment_method: str
    transaction_code: str | None = None
    notes: str | None = None


class RecordPaymentRequest(BaseModel):
    amount: float = Field(gt=0)
    payment_method: str
    transaction_code: str | None = None


class PaymentRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    customer_id: uuid.UUID
    invoice_id: uuid.UUID | None
    amount: float
    payment_method: str
    transaction_code: str | None
    payment_date: datetime
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
