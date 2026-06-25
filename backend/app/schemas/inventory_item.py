import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class InventoryItemBase(BaseModel):
    name: str
    category: str
    quantity_in_stock: int = Field(ge=0)
    unit_cost: float = Field(ge=0)
    supplier: str | None = None
    min_stock_level: int = Field(ge=0)
    notes: str | None = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    quantity_in_stock: int | None = None
    unit_cost: float | None = None
    supplier: str | None = None
    min_stock_level: int | None = None
    notes: str | None = None


class InventoryItemRead(InventoryItemBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
