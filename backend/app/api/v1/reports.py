import csv
from datetime import date
from io import StringIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AnyStaff
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User as UserModel

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/revenue")
async def revenue_report(
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
):
    org_id = user.organization_id

    result = await db.execute(
        select(
            extract("year", Invoice.issue_date).label("year"),
            extract("month", Invoice.issue_date).label("month"),
            func.sum(Invoice.total).label("total"),
            func.sum(Invoice.vat_amount).label("vat"),
            func.count(Invoice.id).label("count"),
        )
        .where(
            Invoice.organization_id == org_id,
            Invoice.status == "paid",
            Invoice.issue_date >= (from_date or date(2020, 1, 1)),
            Invoice.issue_date <= (to_date or date(2099, 12, 31)),
        )
        .group_by(extract("year", Invoice.issue_date), extract("month", Invoice.issue_date))
        .order_by(extract("year", Invoice.issue_date).desc(), extract("month", Invoice.issue_date).desc())
        .limit(24)
    )
    rows = result.all()

    return {
        "report": "revenue",
        "from": str(from_date or "all"),
        "to": str(to_date or "all"),
        "months": [
            {
                "year": int(r.year),
                "month": int(r.month),
                "label": f"{['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][int(r.month)]} {int(r.year)}",
                "revenue": float(r.total),
                "vat": float(r.vat),
                "invoice_count": int(r.count),
            }
            for r in rows
        ],
        "totals": {
            "total_revenue": sum(float(r.total) for r in rows),
            "total_vat": sum(float(r.vat) for r in rows),
            "total_invoices": sum(int(r.count) for r in rows),
        },
    }


@router.get("/collections")
async def collections_report(
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
):
    org_id = user.organization_id
    fr = from_date or date(2020, 1, 1)
    to = to_date or date(2099, 12, 31)

    total_billed = await db.scalar(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.organization_id == org_id,
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
    )

    total_collected = await db.scalar(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.organization_id == org_id,
            Invoice.status == "paid",
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
    )

    total_outstanding = await db.scalar(
        select(func.coalesce(func.sum(Invoice.balance_due), 0)).where(
            Invoice.organization_id == org_id,
            Invoice.status.in_(["sent", "overdue", "partially_paid"]),
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
    )

    overdue = await db.scalar(
        select(func.count()).where(
            Invoice.organization_id == org_id,
            Invoice.status == "overdue",
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
    )

    paid = await db.scalar(
        select(func.count()).where(
            Invoice.organization_id == org_id,
            Invoice.status == "paid",
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
    )

    total_inv = max(await db.scalar(
        select(func.count()).where(
            Invoice.organization_id == org_id,
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
    ) or 0, 1)

    monthly_result = await db.execute(
        select(
            extract("year", Invoice.issue_date).label("year"),
            extract("month", Invoice.issue_date).label("month"),
            func.sum(Invoice.total).label("billed"),
            func.sum(case((Invoice.status == "paid", Invoice.total), else_=0)).label("collected"),
            func.sum(case((Invoice.status != "paid", Invoice.balance_due), else_=0)).label("outstanding"),
        )
        .where(
            Invoice.organization_id == org_id,
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
        .group_by(extract("year", Invoice.issue_date), extract("month", Invoice.issue_date))
        .order_by(extract("year", Invoice.issue_date), extract("month", Invoice.issue_date))
        .limit(24)
    )

    monthly_data = [
        {
            "label": f"{['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][int(r.month)]} {int(r.year)}",
            "billed": float(r.billed),
            "collected": float(r.collected),
            "outstanding": float(r.outstanding),
        }
        for r in monthly_result.all()
    ]

    return {
        "report": "collections",
        "from": str(fr),
        "to": str(to),
        "total_billed": float(total_billed or 0),
        "total_collected": float(total_collected or 0),
        "total_outstanding": float(total_outstanding or 0),
        "collection_rate": round(float(total_collected or 0) / float(total_billed or 1) * 100, 1) if total_billed else 0,
        "overdue_invoices": overdue or 0,
        "paid_invoices": paid or 0,
        "total_invoices": total_inv,
        "monthly": monthly_data,
    }


@router.get("/customers")
async def customer_report(
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
):
    org_id = user.organization_id
    fr = from_date or date(2020, 1, 1)
    to = to_date or date(2099, 12, 31)

    total = await db.scalar(
        select(func.count()).where(Customer.organization_id == org_id)
    )

    new = await db.scalar(
        select(func.count()).where(
            Customer.organization_id == org_id,
            Customer.created_at >= fr,
            Customer.created_at <= to,
        )
    )

    active = await db.scalar(
        select(func.count()).where(
            Customer.organization_id == org_id,
            Customer.status == "active",
        )
    )

    suspended = await db.scalar(
        select(func.count()).where(
            Customer.organization_id == org_id,
            Customer.status == "suspended",
        )
    )

    monthly = await db.execute(
        select(
            extract("year", Customer.created_at).label("year"),
            extract("month", Customer.created_at).label("month"),
            func.count(Customer.id).label("count"),
        )
        .where(Customer.organization_id == org_id)
        .group_by(extract("year", Customer.created_at), extract("month", Customer.created_at))
        .order_by(extract("year", Customer.created_at).desc(), extract("month", Customer.created_at).desc())
        .limit(12)
    )

    return {
        "report": "customers",
        "total_customers": total or 0,
        "new_customers": new or 0,
        "active_customers": active or 0,
        "suspended_customers": suspended or 0,
        "signups_by_month": [
            {
                "label": f"{['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][int(r.month)]} {int(r.year)}",
                "count": int(r.count),
            }
            for r in monthly.all()
        ],
    }


@router.get("/plans")
async def plan_report(
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
):
    org_id = user.organization_id

    plans = await db.execute(
        select(
            Plan.id,
            Plan.name,
            Plan.type,
            Plan.price,
            Plan.download_speed_mbps,
            Plan.upload_speed_mbps,
            func.count(Subscription.id).label("subscriber_count"),
        )
        .outerjoin(Subscription, Subscription.plan_id == Plan.id)
        .where(Plan.organization_id == org_id)
        .group_by(Plan.id)
        .order_by(func.count(Subscription.id).desc())
    )

    return {
        "report": "plans",
        "plans": [
            {
                "name": row.name,
                "type": row.type,
                "price": float(row.price),
                "speed": f"{row.download_speed_mbps}/{row.upload_speed_mbps} Mbps",
                "subscribers": int(row.subscriber_count),
                "monthly_revenue": float(row.price) * int(row.subscriber_count),
            }
            for row in plans.all()
        ],
    }


@router.get("/tax")
async def tax_report(
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
):
    org_id = user.organization_id
    fr = from_date or date(2020, 1, 1)
    to = to_date or date(2099, 12, 31)

    result = await db.execute(
        select(
            extract("year", Invoice.issue_date).label("year"),
            extract("month", Invoice.issue_date).label("month"),
            func.sum(Invoice.subtotal).label("subtotal"),
            func.sum(Invoice.vat_amount).label("vat"),
            func.sum(Invoice.total).label("total"),
            func.count(Invoice.id).label("count"),
        )
        .where(
            Invoice.organization_id == org_id,
            Invoice.status == "paid",
            Invoice.issue_date >= fr,
            Invoice.issue_date <= to,
        )
        .group_by(extract("year", Invoice.issue_date), extract("month", Invoice.issue_date))
        .order_by(extract("year", Invoice.issue_date).desc(), extract("month", Invoice.issue_date).desc())
        .limit(24)
    )
    rows = result.all()

    return {
        "report": "tax",
        "from": str(fr),
        "to": str(to),
        "months": [
            {
                "label": f"{['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][int(r.month)]} {int(r.year)}",
                "subtotal": float(r.subtotal),
                "vat_16": float(r.vat),
                "total": float(r.total),
                "invoice_count": int(r.count),
            }
            for r in rows
        ],
        "totals": {
            "total_subtotal": sum(float(r.subtotal) for r in rows),
            "total_vat": sum(float(r.vat) for r in rows),
            "total_with_vat": sum(float(r.total) for r in rows),
        },
    }


@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AnyStaff),
):
    """Export a report as CSV."""
    output = StringIO()
    writer = csv.writer(output)

    if report_type == "revenue":
        writer.writerow(["Month", "Revenue", "VAT", "Invoice Count"])
        data = await revenue_report(from_date=from_date, to_date=to_date, db=db, user=user)
        for m in data["months"]:
            writer.writerow([m["label"], m["revenue"], m["vat"], m["invoice_count"]])

    elif report_type == "collections":
        writer.writerow(["Metric", "Value"])
        data = await collections_report(from_date=from_date, to_date=to_date, db=db, user=user)
        for key in ("total_billed", "total_collected", "total_outstanding", "collection_rate", "overdue_invoices", "paid_invoices", "total_invoices"):
            writer.writerow([key.replace("_", " ").title(), data.get(key, "")])

    elif report_type == "tax":
        writer.writerow(["Month", "Subtotal", "VAT (16%)", "Total", "Invoices"])
        data = await tax_report(from_date=from_date, to_date=to_date, db=db, user=user)
        for m in data["months"]:
            writer.writerow([m["label"], m["subtotal"], m["vat_16"], m["total"], m["invoice_count"]])

    elif report_type == "plans":
        writer.writerow(["Plan", "Type", "Price", "Speed", "Subscribers", "Monthly Revenue"])
        data = await plan_report(db=db, user=user)
        for p in data["plans"]:
            writer.writerow([p["name"], p["type"], p["price"], p["speed"], p["subscribers"], p["monthly_revenue"]])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"},
    )
