import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, AnyStaff, BillingStaff
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.organization import Organization
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceRead
from app.schemas.payment import RecordPaymentRequest
from app.services.invoice_service import InvoiceService
from app.services.pdf_service import render_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceRead])
async def list_invoices(
    status: str | None = Query(None),
    customer_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = InvoiceService(db)
    return await service.list_invoices(
        user.organization_id,
        status=status,
        customer_id=customer_id,
        skip=skip,
        limit=limit,
    )


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = InvoiceService(db)
    invoice = await service.get_invoice(invoice_id, user.organization_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("", response_model=InvoiceRead, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    service = InvoiceService(db)
    return await service.create_invoice(data, user.organization_id)


@router.post("/{invoice_id}/send")
async def send_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    service = InvoiceService(db)
    sent = await service.send_invoice_email(invoice_id, user.organization_id)
    if not sent:
        raise HTTPException(
            status_code=400,
            detail="Failed to send invoice. Customer may not have an email address.",
        )
    return {"message": "Invoice sent successfully"}


@router.post("/{invoice_id}/payment")
async def record_payment(
    invoice_id: uuid.UUID,
    data: RecordPaymentRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    service = InvoiceService(db)
    payment = await service.record_payment(
        invoice_id, data.amount, data.payment_method,
        organization_id=user.organization_id,
        transaction_code=data.transaction_code
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        "message": "Payment recorded",
        "payment_id": str(payment.id),
        "amount": data.amount,
    }


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = InvoiceService(db)
    invoice = await service.get_invoice(invoice_id, user.organization_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    result = await db.execute(
        select(Organization).where(Organization.id == user.organization_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=500, detail="Organization not found")

    cust_result = await db.execute(
        select(Customer).where(Customer.id == invoice.customer_id)
    )
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    items_result = await db.execute(
        select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)
    )
    items = items_result.scalars().all()

    pdf_bytes = render_invoice_pdf(
        invoice_number=invoice.invoice_number,
        issue_date=invoice.issue_date.isoformat(),
        due_date=invoice.due_date.isoformat(),
        status=invoice.status,
        org_name=org.name,
        org_address=org.address,
        org_kra_pin=org.kra_pin,
        org_phone=org.phone,
        org_email=org.email,
        customer_name=f"{customer.first_name} {customer.last_name}",
        customer_phone=customer.phone,
        customer_email=customer.email,
        customer_kra_pin=customer.kra_pin,
        items=[{"description": i.description, "quantity": i.quantity, "unit_price": float(i.unit_price), "total": float(i.total)} for i in items],
        subtotal=float(invoice.subtotal),
        vat_amount=float(invoice.vat_amount),
        total=float(invoice.total),
        balance_due=float(invoice.balance_due),
        notes=invoice.notes,
        kra_etims_code=invoice.kra_etims_code,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'
        },
    )
