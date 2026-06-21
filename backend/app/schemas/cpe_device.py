import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class CpeDeviceBase(BaseModel):
    serial_number: str
    model: str
    manufacturer: str
    device_type: str
    status: str = "in_stock"
    purchase_date: date | None = None
    warranty_expiry: date | None = None
    notes: str | None = None

    @field_validator("device_type")
    @classmethod
    def validate_device_type(cls, v: str) -> str:
        allowed = ["router", "ont", "cpe", "antenna", "other"]
        if v not in allowed:
            raise ValueError(f"device_type must be one of {allowed}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = ["in_stock", "assigned", "defective", "retired"]
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class CpeDeviceCreate(CpeDeviceBase):
    pass


class CpeDeviceUpdate(BaseModel):
    serial_number: str | None = None
    model: str | None = None
    manufacturer: str | None = None
    device_type: str | None = None
    status: str | None = None
    purchase_date: date | None = None
    warranty_expiry: date | None = None
    notes: str | None = None


class CpeDeviceAssign(BaseModel):
    customer_id: uuid.UUID
    subscription_id: uuid.UUID


class CpeDeviceRead(CpeDeviceBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    customer_id: uuid.UUID | None = None
    subscription_id: uuid.UUID | None = None
    assigned_at: datetime | None = None
    returned_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
