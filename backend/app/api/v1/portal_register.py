import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.organization import Organization
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.utils.security import hash_password

router = APIRouter(prefix="/portal", tags=["portal"])


class PortalRegisterRequest(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    phone: str = Field(min_length=10)
    email: str | None = None
    password: str = Field(min_length=4)
    id_number: str | None = None
    physical_address: str | None = None
    service_address: str | None = None
    plan_id: uuid.UUID
    org_id: uuid.UUID | None = None


@router.get("/register/plans")
async def portal_register_plans(
    org_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Organization).where(Organization.is_active == True)
    if org_id:
        query = query.where(Organization.id == org_id)
    result = await db.execute(query)
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=500, detail="No active organization found")

    result = await db.execute(
        select(Plan).where(
            Plan.organization_id == org.id,
            Plan.is_active == True,
        )
    )
    plans = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "type": p.type,
            "download_speed_mbps": p.download_speed_mbps,
            "upload_speed_mbps": p.upload_speed_mbps,
            "data_cap_gb": p.data_cap_gb,
            "price": float(p.price),
            "setup_fee": float(p.setup_fee),
            "billing_cycle": p.billing_cycle,
            "description": p.description,
        }
        for p in plans
    ]


@router.post("/register", status_code=201)
async def portal_register(
    data: PortalRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate phone
    existing = await db.execute(select(Customer).where(Customer.phone == data.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Phone number already registered")

    # Find org — prefer org_id from request, fall back to first active
    if data.org_id:
        org_result = await db.execute(
            select(Organization).where(
                Organization.id == data.org_id,
                Organization.is_active == True,
            )
        )
    else:
        org_result = await db.execute(
            select(Organization).where(Organization.is_active == True)
        )
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=500, detail="No active organization found")

    plan_result = await db.execute(
        select(Plan).where(Plan.id == data.plan_id, Plan.is_active == True)
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    customer = Customer(
        organization_id=org.id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        email=data.email,
        id_number=data.id_number,
        physical_address=data.physical_address,
        service_address=data.service_address,
        status="pending",
        portal_password=hash_password(data.password),
    )
    db.add(customer)
    await db.flush()

    subscription = Subscription(
        organization_id=org.id,
        customer_id=customer.id,
        plan_id=plan.id,
        status="pending",
        next_billing_date=date.today() + timedelta(days=30),
        auto_renew=True,
    )
    db.add(subscription)
    await db.flush()

    # Audit log for admin notification
    audit = AuditLog(
        organization_id=org.id,
        action="create",
        resource_type="registration",
        resource_id=str(customer.id),
        new_values={
            "customer_name": f"{data.first_name} {data.last_name}",
            "phone": data.phone,
            "plan": plan.name,
            "status": "pending",
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(customer)

    return {
        "message": "Registration successful. An administrator will activate your account shortly.",
        "customer_id": str(customer.id),
    }


@router.post("/register/resend")
async def portal_resend_activation(
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.phone == phone, Customer.status == "pending")
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="No pending registration found for this phone")
    return {"message": "Your registration is still pending review. Please contact support."}
