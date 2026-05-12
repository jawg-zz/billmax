import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, AnyStaff, BillingStaff
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionRead,
    SubscriptionUpdate,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("", response_model=list[SubscriptionRead])
async def list_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = SubscriptionService(db)
    return await service.list(user.organization_id, skip=skip, limit=limit)


@router.post("", response_model=SubscriptionRead, status_code=201)
async def create_subscription(
    data: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    service = SubscriptionService(db)
    return await service.create(data, organization_id=user.organization_id)


@router.get("/{subscription_id}", response_model=SubscriptionRead)
async def get_subscription(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = SubscriptionService(db)
    return await service.get(subscription_id, user.organization_id)


@router.put("/{subscription_id}", response_model=SubscriptionRead)
async def update_subscription(
    subscription_id: uuid.UUID,
    data: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    service = SubscriptionService(db)
    return await service.update(subscription_id, data, user.organization_id)


@router.delete("/{subscription_id}", status_code=204)
async def delete_subscription(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = SubscriptionService(db)
    await service.delete(subscription_id, user.organization_id)
