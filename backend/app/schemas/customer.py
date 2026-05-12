import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: str | None = None
    id_number: str | None = None
    kra_pin: str | None = None
    alternative_phone: str | None = None
    physical_address: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    service_address: str | None = None
    mpesa_phone: str | None = None
    notes: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    status: str | None = None


class CustomerRead(CustomerBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
