import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, AnyStaff
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanRead, PlanUpdate
from app.services.plan_service import PlanService

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanRead])
async def list_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = PlanService(db)
    return await service.list(user.organization_id, skip=skip, limit=limit)


@router.post("", response_model=PlanRead, status_code=201)
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = PlanService(db)
    return await service.create(data, organization_id=user.organization_id)


@router.get("/{plan_id}", response_model=PlanRead)
async def get_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = PlanService(db)
    return await service.get(plan_id, user.organization_id)


@router.put("/{plan_id}", response_model=PlanRead)
async def update_plan(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = PlanService(db)
    return await service.update(plan_id, data, user.organization_id)


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = PlanService(db)
    await service.delete(plan_id, user.organization_id)
