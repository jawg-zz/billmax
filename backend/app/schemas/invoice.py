import uuid
from datetime import date, datetime

from pydantic import BaseModel


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    is_taxable: bool = True


class InvoiceItemRead(BaseModel):
    id: uuid.UUID
    description: str
    quantity: int
    unit_price: float
    total: float
    is_taxable: bool
    tax_rate: float
    tax_amount: float

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    customer_id: uuid.UUID
    subscription_id: uuid.UUID | None = None
    issue_date: date
    due_date: date
    items: list[InvoiceItemCreate]
    notes: str | None = None


class InvoiceRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    customer_id: uuid.UUID
    subscription_id: uuid.UUID | None
    invoice_number: str
    issue_date: date
    due_date: date
    subtotal: float
    vat_amount: float
    total: float
    balance_due: float
    status: str
    notes: str | None = None
    kra_etims_code: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemRead] = []

    model_config = {"from_attributes": True}
