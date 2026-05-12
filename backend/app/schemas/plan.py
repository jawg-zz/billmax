import uuid
from datetime import datetime

from pydantic import BaseModel


class PlanBase(BaseModel):
    name: str
    description: str | None = None
    type: str
    download_speed_mbps: int
    upload_speed_mbps: int
    data_cap_gb: int | None = None
    fup_threshold_gb: int | None = None
    fup_speed_mbps: int | None = None
    price: float
    setup_fee: float = 0
    billing_cycle: str = "monthly"
    is_taxable: bool = True
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(PlanBase):
    name: str | None = None
    type: str | None = None
    download_speed_mbps: int | None = None
    upload_speed_mbps: int | None = None
    price: float | None = None
    billing_cycle: str | None = None


class PlanRead(PlanBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
