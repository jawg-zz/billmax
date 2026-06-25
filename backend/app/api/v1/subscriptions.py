import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, AnyStaff, BillingStaff
from app.models.customer import Customer
from app.models.plan import Plan
from app.models.subscription import Subscription
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
    # Validate customer and plan belong to this organization
    from app.models.customer import Customer
    from app.models.plan import Plan
    cust = await db.execute(
        select(Customer).where(
            Customer.id == data.customer_id,
            Customer.organization_id == user.organization_id,
        )
    )
    if not cust.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found in your organization")
    plan = await db.execute(
        select(Plan).where(
            Plan.id == data.plan_id,
            Plan.organization_id == user.organization_id,
        )
    )
    if not plan.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Plan not found in your organization")
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
    # Validate status transitions
    VALID_TRANSITIONS = {
        "active": ["suspended", "cancelled"],
        "pending": ["active", "cancelled"],
        "suspended": ["active", "cancelled"],
        "cancelled": [],
    }
    if data.status is not None:
        # Fetch current subscription to check transition
        curr = await db.execute(
            select(Subscription).where(
                Subscription.id == subscription_id,
                Subscription.organization_id == user.organization_id,
            )
        )
        current_sub = curr.scalar_one_or_none()
        if not current_sub:
            raise HTTPException(status_code=404, detail="Subscription not found")
        allowed = VALID_TRANSITIONS.get(current_sub.status, [])
        if data.status not in allowed and data.status != current_sub.status:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition from '{current_sub.status}' to '{data.status}'. Allowed: {allowed if allowed else 'none'}",
            )
        # If reactivating from cancelled, reject
        if current_sub.status == "cancelled":
            raise HTTPException(status_code=400, detail="Cannot update a cancelled subscription")

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
