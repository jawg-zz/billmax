import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.customer import Customer
from app.models.organization import Organization
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.utils.security import hash_password

router = APIRouter(prefix="/portal", tags=["portal"])


@router.get("/register/plans")
async def portal_register_plans(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Organization).where(Organization.is_active == True)
    )
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
    first_name: str = Query(...),
    last_name: str = Query(...),
    phone: str = Query(...),
    email: str | None = Query(None),
    password: str = Query(..., min_length=4),
    id_number: str | None = Query(None),
    physical_address: str | None = Query(None),
    service_address: str | None = Query(None),
    plan_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Customer).where(Customer.phone == phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Phone number already registered")

    org_result = await db.execute(
        select(Organization).where(Organization.is_active == True)
    )
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=500, detail="No active organization found")

    plan_result = await db.execute(
        select(Plan).where(Plan.id == plan_id, Plan.is_active == True)
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    customer = Customer(
        organization_id=org.id,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        email=email,
        id_number=id_number,
        physical_address=physical_address,
        service_address=service_address,
        status="pending",
        portal_password=hash_password(password),
    )
    db.add(customer)
    await db.flush()

    from datetime import date, timedelta

    subscription = Subscription(
        organization_id=org.id,
        customer_id=customer.id,
        plan_id=plan.id,
        status="pending",
        next_billing_date=date.today() + timedelta(days=30),
        auto_renew=True,
    )
    db.add(subscription)
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
