from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AnyStaff
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User as UserModel

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
):
    org_id = user.organization_id

    cust_count = await db.scalar(
        select(func.count()).where(Customer.organization_id == org_id)
    )

    active_subs = await db.scalar(
        select(func.count()).where(
            Subscription.organization_id == org_id,
            Subscription.status == "active",
        )
    )

    overdue_count = await db.scalar(
        select(func.count()).where(
            Invoice.organization_id == org_id,
            Invoice.status == "overdue",
        )
    )

    total_outstanding = await db.scalar(
        select(func.coalesce(func.sum(Invoice.balance_due), 0)).where(
            Invoice.organization_id == org_id,
            Invoice.status.in_(["sent", "overdue", "partially_paid"]),
        )
    )

    active_plans = await db.scalar(
        select(func.count()).where(
            Plan.organization_id == org_id,
            Plan.is_active == True,
        )
    )

    return {
        "total_customers": cust_count or 0,
        "active_subscriptions": active_subs or 0,
        "overdue_invoices": overdue_count or 0,
        "total_outstanding": float(total_outstanding or 0),
        "active_plans": active_plans or 0,
    }
