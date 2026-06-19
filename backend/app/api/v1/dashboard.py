from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import literal_column, select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AnyStaff
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
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
    unprovisioned = await db.scalar(
        select(func.count()).where(
            Subscription.organization_id == org_id,
            Subscription.status == "active",
            Subscription.provisioned == False,
        )
    )

    today = date.today()
    first_of_month = today.replace(day=1)
    monthly_revenue = await db.scalar(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.organization_id == org_id,
            Invoice.status == "paid",
            Invoice.issue_date >= first_of_month,
        )
    )

    paid_count = await db.scalar(
        select(func.count()).where(
            Invoice.organization_id == org_id,
            Invoice.status == "paid",
        )
    )
    total_invoices = await db.scalar(
        select(func.count()).where(Invoice.organization_id == org_id)
    )
    collection_rate = round((paid_count or 0) / max(total_invoices or 1, 1) * 100, 1)

    aging_result = await db.execute(
        select(
            func.sum(case((Invoice.due_date < today - timedelta(days=30), 1), else_=0)).label("over_30"),
            func.sum(case((Invoice.due_date.between(today - timedelta(days=29), today - timedelta(days=15)), 1), else_=0)).label("days_15_29"),
            func.sum(case((Invoice.due_date.between(today - timedelta(days=14), today - timedelta(days=8)), 1), else_=0)).label("days_8_14"),
            func.sum(case((Invoice.due_date.between(today - timedelta(days=7), today - timedelta(days=1)), 1), else_=0)).label("days_1_7"),
        ).where(
            Invoice.organization_id == org_id,
            Invoice.status.in_(["sent", "overdue", "partially_paid"]),
            Invoice.due_date < today,
        )
    )
    row = aging_result.one()

    return {
        "total_customers": cust_count or 0,
        "active_subscriptions": active_subs or 0,
        "overdue_invoices": overdue_count or 0,
        "total_outstanding": float(total_outstanding or 0),
        "active_plans": active_plans or 0,
        "unprovisioned_subs": unprovisioned or 0,
        "monthly_revenue": float(monthly_revenue or 0),
        "collection_rate": collection_rate,
        "overdue_aging": {
            "days_1_7": int(row.days_1_7 or 0),
            "days_8_14": int(row.days_8_14 or 0),
            "days_15_29": int(row.days_15_29 or 0),
            "over_30": int(row.over_30 or 0),
        },
    }


@router.get("/activity")
async def dashboard_activity(
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
    limit: int = 10,
):
    org_id = user.organization_id

    payments = await db.execute(
        select(
            Payment.payment_date.label("timestamp"),
            Payment.amount,
            Customer.first_name,
            Customer.last_name,
            literal_column("'payment_received'").label("type"),
        )
        .join(Customer, Payment.customer_id == Customer.id)
        .where(
            Payment.organization_id == org_id,
            Payment.status == "completed",
        )
        .order_by(Payment.payment_date.desc())
        .limit(limit)
    )

    invoices = await db.execute(
        select(
            Invoice.created_at.label("timestamp"),
            Invoice.total,
            Customer.first_name,
            Customer.last_name,
            literal_column("'invoice_created'").label("type"),
        )
        .join(Customer, Invoice.customer_id == Customer.id)
        .where(Invoice.organization_id == org_id)
        .order_by(Invoice.created_at.desc())
        .limit(limit)
    )

    subs = await db.execute(
        select(
            Subscription.created_at.label("timestamp"),
            literal_column("0").label("amount"),
            Customer.first_name,
            Customer.last_name,
            literal_column("'subscription_created'").label("type"),
        )
        .join(Customer, Subscription.customer_id == Customer.id)
        .where(Subscription.organization_id == org_id)
        .order_by(Subscription.created_at.desc())
        .limit(limit)
    )

    items: list[dict] = []

    for row in payments:
        items.append({
            "type": "payment_received",
            "description": "Payment received",
            "customer_name": f"{row.first_name} {row.last_name}",
            "amount": float(row.amount),
            "timestamp": str(row.timestamp),
        })

    for row in invoices:
        items.append({
            "type": "invoice_created",
            "description": "Invoice generated",
            "customer_name": f"{row.first_name} {row.last_name}",
            "amount": float(row.total),
            "timestamp": str(row.timestamp),
        })

    for row in subs:
        items.append({
            "type": "subscription_created",
            "description": "New subscription",
            "customer_name": f"{row.first_name} {row.last_name}",
            "amount": None,
            "timestamp": str(row.timestamp),
        })

    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items[:limit]
