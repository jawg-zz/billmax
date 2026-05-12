import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, BillingStaff
from app.models.user import User
from app.services.billing_engine import preview_billing, run_billing
from app.schemas.invoice import InvoiceRead

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/run")
async def trigger_billing_run(
    target_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    invoices = await run_billing(db, user.organization_id, target_date)
    return {
        "message": f"Billing run complete",
        "invoices_created": len(invoices),
        "invoice_numbers": [inv.invoice_number for inv in invoices],
    }


@router.get("/preview")
async def billing_preview(
    target_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    preview = await preview_billing(db, user.organization_id, target_date)
    total_revenue = sum(p["total"] for p in preview)
    return {
        "total_customers": len(preview),
        "total_revenue": total_revenue,
        "details": preview,
    }
