import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, AnyStaff
from app.models.cpe_device import CpeDevice
from app.models.inventory_item import InventoryItem
from app.models.user import User
from app.schemas.cpe_device import (
    CpeDeviceAssign,
    CpeDeviceCreate,
    CpeDeviceRead,
    CpeDeviceUpdate,
)
from app.schemas.inventory_item import (
    InventoryItemCreate,
    InventoryItemRead,
    InventoryItemUpdate,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[CpeDeviceRead])
async def list_cpe_devices(
    status: str | None = Query(None),
    customer_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    query = select(CpeDevice).where(
        CpeDevice.organization_id == user.organization_id
    )
    if status:
        query = query.where(CpeDevice.status == status)
    if customer_id:
        query = query.where(CpeDevice.customer_id == customer_id)
    query = query.order_by(CpeDevice.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=CpeDeviceRead, status_code=201)
async def create_cpe_device(
    data: CpeDeviceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    existing = await db.execute(
        select(CpeDevice).where(CpeDevice.serial_number == data.serial_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A device with this serial number already exists",
        )

    device = CpeDevice(
        organization_id=user.organization_id,
        serial_number=data.serial_number,
        model=data.model,
        manufacturer=data.manufacturer,
        device_type=data.device_type,
        status=data.status,
        purchase_date=data.purchase_date,
        warranty_expiry=data.warranty_expiry,
        notes=data.notes,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@router.get("/{device_id}", response_model=CpeDeviceRead)
async def get_cpe_device(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    result = await db.execute(
        select(CpeDevice).where(
            CpeDevice.id == device_id,
            CpeDevice.organization_id == user.organization_id,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="CPE device not found")
    return device


@router.patch("/{device_id}", response_model=CpeDeviceRead)
async def update_cpe_device(
    device_id: uuid.UUID,
    data: CpeDeviceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    result = await db.execute(
        select(CpeDevice).where(
            CpeDevice.id == device_id,
            CpeDevice.organization_id == user.organization_id,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="CPE device not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)

    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=204)
async def delete_cpe_device(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    result = await db.execute(
        select(CpeDevice).where(
            CpeDevice.id == device_id,
            CpeDevice.organization_id == user.organization_id,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="CPE device not found")

    await db.delete(device)
    await db.commit()


@router.post("/{device_id}/assign", response_model=CpeDeviceRead)
async def assign_cpe_device(
    device_id: uuid.UUID,
    data: CpeDeviceAssign,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    result = await db.execute(
        select(CpeDevice).where(
            CpeDevice.id == device_id,
            CpeDevice.organization_id == user.organization_id,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="CPE device not found")

    device.customer_id = data.customer_id
    device.subscription_id = data.subscription_id
    device.status = "assigned"
    device.assigned_at = datetime.now(timezone.utc)
    device.returned_at = None

    await db.commit()
    await db.refresh(device)
    return device


@router.post("/{device_id}/return", response_model=CpeDeviceRead)
async def return_cpe_device(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    result = await db.execute(
        select(CpeDevice).where(
            CpeDevice.id == device_id,
            CpeDevice.organization_id == user.organization_id,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="CPE device not found")

    device.customer_id = None
    device.subscription_id = None
    device.status = "in_stock"
    device.returned_at = datetime.now(timezone.utc)
    device.assigned_at = None

    await db.commit()
    await db.refresh(device)
    return device


@router.get("/stock", response_model=list[InventoryItemRead])
async def list_inventory_stock(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    query = (
        select(InventoryItem)
        .where(InventoryItem.organization_id == user.organization_id)
        .order_by(InventoryItem.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/stock", response_model=InventoryItemRead, status_code=201)
async def create_inventory_stock(
    data: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    item = InventoryItem(
        organization_id=user.organization_id,
        name=data.name,
        category=data.category,
        quantity_in_stock=data.quantity_in_stock,
        unit_cost=data.unit_cost,
        supplier=data.supplier,
        min_stock_level=data.min_stock_level,
        notes=data.notes,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/stock/{item_id}", response_model=InventoryItemRead)
async def update_inventory_stock(
    item_id: uuid.UUID,
    data: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.organization_id == user.organization_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.commit()
    await db.refresh(item)
    return item
