import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.ticket import Ticket, TicketComment
from app.portal_auth import create_portal_token, get_portal_customer
from app.services.invoice_service import InvoiceService
from app.services.mpesa_service import initiate_stk_push
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/portal", tags=["portal"])


from pydantic import BaseModel

class PortalLoginRequest(BaseModel):
    phone: str
    password: str

class PortalTicketCreate(BaseModel):
    subject: str
    description: str
    priority: str = "medium"


@router.post("/login")
async def portal_login(
    data: PortalLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.phone == data.phone)
    )
    customers = result.scalars().all()
    # In multi-org, phone may match across orgs — try each
    customer = None
    for c in customers:
        if c.portal_password and verify_password(data.password, c.portal_password):
            customer = c
            break
    if not customer:
        raise HTTPException(status_code=401, detail="Invalid phone or password")

    token = create_portal_token(customer.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "customer": {
            "id": str(customer.id),
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "phone": customer.phone,
            "email": customer.email,
        },
    }


@router.get("/me")
async def portal_me(customer: Customer = Depends(get_portal_customer)):
    return {
        "id": str(customer.id),
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "phone": customer.phone,
        "email": customer.email,
        "mpesa_phone": customer.mpesa_phone,
        "status": customer.status,
    }


@router.post("/change-password")
async def portal_change_password(
    current_password: str = Query(...),
    new_password: str = Query(...),
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(current_password, customer.portal_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    customer.portal_password = hash_password(new_password)
    await db.commit()
    return {"message": "Password changed"}


@router.get("/invoices")
async def portal_invoices(
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.customer_id == customer.id)
        .order_by(Invoice.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    invoices = result.scalars().all()
    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "issue_date": str(inv.issue_date),
            "due_date": str(inv.due_date),
            "total": float(inv.total),
            "balance_due": float(inv.balance_due),
            "status": inv.status,
        }
        for inv in invoices
    ]


@router.get("/invoices/{invoice_id}")
async def portal_invoice_detail(
    invoice_id: uuid.UUID,
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.customer_id == customer.id,
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    items_result = await db.execute(
        select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)
    )
    items = items_result.scalars().all()

    return {
        "id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "issue_date": str(invoice.issue_date),
        "due_date": str(invoice.due_date),
        "subtotal": float(invoice.subtotal),
        "vat_amount": float(invoice.vat_amount),
        "total": float(invoice.total),
        "balance_due": float(invoice.balance_due),
        "status": invoice.status,
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "total": float(item.total),
            }
            for item in items
        ],
    }


@router.post("/invoices/{invoice_id}/pay")
async def portal_pay_invoice(
    invoice_id: uuid.UUID,
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.customer_id == customer.id,
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.balance_due <= 0:
        raise HTTPException(status_code=400, detail="Invoice already paid")

    phone = customer.mpesa_phone or customer.phone
    result = await initiate_stk_push(
        db,
        organization_id=customer.organization_id,
        invoice_id=invoice.id,
        customer_id=customer.id,
        phone=phone,
        amount=float(invoice.balance_due),
    )
    return result


@router.get("/usage")
async def portal_usage(
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
):
    from app.services.usage_service import get_subscription_current_usage

    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.customer_id == customer.id,
            Subscription.status.in_(["active", "suspended"]),
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return {"usage": None}
    usage = await get_subscription_current_usage(db, sub.id)
    return {"usage": usage}


@router.get("/subscription")
async def portal_subscription(
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.customer_id == customer.id,
            Subscription.status.in_(["active", "suspended"]),
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return {"subscription": None}

    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()

    return {
        "subscription": {
            "id": str(sub.id),
            "status": sub.status,
            "next_billing_date": str(sub.next_billing_date),
            "provisioned": sub.provisioned,
            "plan": {
                "name": plan.name if plan else "Unknown",
                "download_speed_mbps": plan.download_speed_mbps if plan else 0,
                "upload_speed_mbps": plan.upload_speed_mbps if plan else 0,
                "price": float(plan.price) if plan else 0,
                "type": plan.type if plan else "",
            } if plan else None,
        }
    }


@router.get("/tickets")
async def portal_tickets(
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket)
        .where(Ticket.customer_id == customer.id)
        .order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "subject": t.subject,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "created_at": str(t.created_at),
        }
        for t in tickets
    ]


@router.post("/tickets", status_code=201)
async def portal_create_ticket(
    data: PortalTicketCreate,
    customer: Customer = Depends(get_portal_customer),
    db: AsyncSession = Depends(get_db),
):
    ticket = Ticket(
        organization_id=customer.organization_id,
        customer_id=customer.id,
        subject=data.subject,
        description=data.description,
        priority=data.priority,
        status="open",
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return {
        "id": str(ticket.id),
        "subject": ticket.subject,
        "status": ticket.status,
        "created_at": str(ticket.created_at),
    }
