import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AnyStaff, TechStaff
from app.models.user import User
from app.schemas.usage import UsageAlertRead, UsageRecordCreate, UsageRecordRead
from app.services.usage_service import (
    check_fup_enforcement,
    get_subscription_current_usage,
    get_usage_summary,
    record_usage,
)

router = APIRouter(prefix="/usage", tags=["usage"])


@router.post("/records", response_model=UsageRecordRead, status_code=201)
async def api_record_usage(
    data: UsageRecordCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(TechStaff),
):
    return await record_usage(
        db,
        organization_id=user.organization_id,
        subscription_id=data.subscription_id,
        download_bytes=data.download_bytes,
        upload_bytes=data.upload_bytes,
        period_start=data.period_start,
        period_end=data.period_end,
        source=data.source,
    )


@router.get("/summary")
async def api_usage_summary(
    subscription_id: uuid.UUID | None = Query(None),
    customer_id: uuid.UUID | None = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    summaries = await get_usage_summary(
        db,
        organization_id=user.organization_id,
        subscription_id=subscription_id,
        customer_id=customer_id,
        days=days,
    )
    return [s.model_dump() for s in summaries]


@router.get("/subscription/{subscription_id}")
async def api_subscription_usage(
    subscription_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    return await get_subscription_current_usage(db, subscription_id, days=days)


@router.post("/enforce-fup")
async def api_enforce_fup(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(TechStaff),
):
    alerts = await check_fup_enforcement(db, user.organization_id)
    return {"alerts_created": len(alerts), "alerts": alerts}
