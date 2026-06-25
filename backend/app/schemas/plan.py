import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PlanBase(BaseModel):
    name: str
    description: str | None = None
    type: str
    download_speed_mbps: int = Field(gt=0)
    upload_speed_mbps: int = Field(gt=0)
    data_cap_gb: int | None = None
    fup_threshold_gb: int | None = None
    fup_speed_mbps: int | None = None
    price: float = Field(gt=0)
    setup_fee: float = Field(ge=0)
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
