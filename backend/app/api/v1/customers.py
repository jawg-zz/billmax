import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, AnyStaff
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead])
async def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = CustomerService(db)
    if status:
        return await service.list_by_status(user.organization_id, status, skip=skip, limit=limit)
    return await service.list(user.organization_id, skip=skip, limit=limit)


@router.post("", response_model=CustomerRead, status_code=201)
async def create_customer(
    data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = CustomerService(db)
    return await service.create(data, organization_id=user.organization_id)


@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = CustomerService(db)
    return await service.get(customer_id, user.organization_id)


@router.put("/{customer_id}", response_model=CustomerRead)
async def update_customer(
    customer_id: uuid.UUID,
    data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = CustomerService(db)
    return await service.update(customer_id, data, user.organization_id)


@router.post("/{customer_id}/approve")
async def approve_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = CustomerService(db)
    customer = await service.get(customer_id, user.organization_id)
    customer.status = "active"

    from app.models.subscription import Subscription
    result = await db.execute(
        select(Subscription).where(
            Subscription.customer_id == customer_id,
            Subscription.status == "pending",
        )
    )
    sub = result.scalar_one_or_none()
    prov_result = {"success": True, "message": "No subscription to provision"}
    if sub:
        sub.status = "active"
        # Provision on network equipment
        try:
            from app.services.provisioning_service import provision_subscription
            prov_result = await provision_subscription(db, sub.id, user.organization_id)
        except Exception as e:
            prov_result = {"success": False, "error": str(e)}

    await db.commit()
    await db.refresh(customer)

    # Send welcome email if customer has email address
    if customer.email:
        try:
            from app.services.pdf_service import render_email_template
            from app.services.email_service import send_email
            from app.models.organization import Organization
            org_result = await db.execute(
                select(Organization).where(Organization.id == user.organization_id)
            )
            org = org_result.scalar_one_or_none()
            org_name = org.name if org else "BillMax"
            from app.config import settings
            portal_url = settings.PORTAL_URL or ""
            html_body = render_email_template(
                "welcome.html",
                customer_name=f"{customer.first_name} {customer.last_name}",
                org_name=org_name,
                portal_url=portal_url,
                portal_login_hint="Use your phone number and the PIN you created during registration.",
            )
            await send_email(
                to=customer.email,
                subject=f"Welcome to {org_name} — Your account is now active",
                html_body=html_body,
            )
        except Exception:
            pass  # email failure shouldn't block approval

    response = CustomerRead.model_validate(customer).model_dump()
    response["provisioning"] = {
        "success": prov_result.get("success", False),
        "error": prov_result.get("error"),
    }
    return response


@router.post("/{customer_id}/reject")
async def reject_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = CustomerService(db)
    customer = await service.get(customer_id, user.organization_id)
    customer.status = "rejected"
    await db.commit()
    await db.refresh(customer)
    return CustomerRead.model_validate(customer)


@router.delete("/{customer_id}", status_code=204)
async def delete_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    service = CustomerService(db)
    try:
        await service.delete(customer_id, user.organization_id)
    except Exception as e:
        err = str(e).lower()
        if "foreign key" in err or "violates foreign" in err:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete customer with existing invoices, subscriptions, or tickets. "
                       "Cancel all subscriptions and resolve all invoices first.",
            )
        raise
