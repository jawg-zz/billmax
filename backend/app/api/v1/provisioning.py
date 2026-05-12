import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, TechStaff
from app.models.user import User
from app.services.provisioning_service import (
    change_subscription_speed,
    deprovision_subscription,
    get_provisioning_logs,
    provision_subscription,
    restore_subscription,
    suspend_subscription,
)

router = APIRouter(prefix="/provisioning", tags=["provisioning"])


@router.post("/provision/{subscription_id}")
async def api_provision(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(TechStaff),
):
    result = await provision_subscription(db, subscription_id, user.organization_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Provisioning failed"))
    return result


@router.post("/suspend/{subscription_id}")
async def api_suspend(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(TechStaff),
):
    result = await suspend_subscription(db, subscription_id, user.organization_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Suspension failed"))
    return result


@router.post("/restore/{subscription_id}")
async def api_restore(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(TechStaff),
):
    result = await restore_subscription(db, subscription_id, user.organization_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Restore failed"))
    return result


@router.post("/speed/{subscription_id}")
async def api_change_speed(
    subscription_id: uuid.UUID,
    plan_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(TechStaff),
):
    result = await change_subscription_speed(
        db, subscription_id, user.organization_id, plan_id
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Speed change failed"))
    return result


@router.post("/deprovision/{subscription_id}")
async def api_deprovision(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    result = await deprovision_subscription(db, subscription_id, user.organization_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Deprovisioning failed"))
    return result


@router.get("/logs")
async def api_provisioning_logs(
    subscription_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(TechStaff),
):
    logs = await get_provisioning_logs(
        db, user.organization_id, subscription_id=subscription_id, skip=skip, limit=limit
    )
    return [
        {
            "id": str(log.id),
            "subscription_id": str(log.subscription_id),
            "action": log.action,
            "backend": log.backend,
            "status": log.status,
            "error": log.error_message,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
