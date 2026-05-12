import uuid
from datetime import date, datetime

from pydantic import BaseModel


class SubscriptionBase(BaseModel):
    customer_id: uuid.UUID
    plan_id: uuid.UUID
    next_billing_date: date
    auto_renew: bool = True
    notes: str | None = None


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    plan_id: uuid.UUID | None = None
    status: str | None = None
    next_billing_date: date | None = None
    auto_renew: bool | None = None
    notes: str | None = None


class SubscriptionRead(SubscriptionBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    status: str
    start_date: datetime
    end_date: datetime | None = None
    provisioned: bool
    provisioned_username: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
