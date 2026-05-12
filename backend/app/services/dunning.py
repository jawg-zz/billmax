from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.notification import Notification
from app.models.organization import Organization
from app.models.subscription import Subscription
from app.provisioning.registry import get_all_backends
from app.services.email_service import send_email
from app.services.pdf_service import render_email_template

OVERDUE_DAYS_SUSPEND = 30


async def process_overdue(
    db: AsyncSession,
    organization_id: int | None = None,
) -> list[dict]:
    today = date.today()
    query = select(Invoice).where(
        Invoice.status.in_(["sent", "overdue", "partially_paid"]),
        Invoice.due_date < today,
    )
    if organization_id:
        query = query.where(Invoice.organization_id == organization_id)

    result = await db.execute(query)
    invoices = result.scalars().all()
    actions: list[dict] = []

    for invoice in invoices:
        days_overdue = (today - invoice.due_date).days
        new_status = "overdue" if invoice.status != "overdue" else invoice.status
        invoice.status = new_status

        org_result = await db.execute(
            select(Organization).where(Organization.id == invoice.organization_id)
        )
        org = org_result.scalar_one()

        cust_result = await db.execute(
            select(Customer).where(Customer.id == invoice.customer_id)
        )
        customer = cust_result.scalar_one()
        if not customer or not customer.email:
            continue

        should_suspend = days_overdue >= OVERDUE_DAYS_SUSPEND

        html_body = render_email_template(
            "overdue_notice.html",
            customer_name=f"{customer.first_name} {customer.last_name}",
            invoice_number=invoice.invoice_number,
            total=float(invoice.total),
            due_date=invoice.due_date.isoformat(),
            days_overdue=days_overdue,
            org_name=org.name,
        )

        sent = await send_email(
            to=customer.email,
            subject=f"OVERDUE: Invoice {invoice.invoice_number} from {org.name}",
            html_body=html_body,
        )

        notification = Notification(
            organization_id=invoice.organization_id,
            customer_id=customer.id,
            recipient=customer.email,
            subject=f"Overdue notice - Invoice {invoice.invoice_number}",
            body=html_body,
            channel="email",
            status="sent" if sent else "failed",
            sent_at=datetime.utcnow() if sent else None,
        )
        db.add(notification)

        if should_suspend:
            sub_result = await db.execute(
                select(Subscription).where(
                    Subscription.id == invoice.subscription_id,
                    Subscription.status == "active",
                )
            )
            sub = sub_result.scalar_one_or_none()
            if sub:
                sub.status = "suspended"
                username = sub.provisioned_username
                if username:
                    for backend in get_all_backends():
                        net_result = await backend.suspend(username=username)
                        actions.append({
                            "action": "network_suspend",
                            "backend": backend.name,
                            "username": username,
                            "success": net_result.get("success", False),
                        })
                actions.append({
                    "action": "suspend",
                    "customer_id": str(customer.id),
                    "subscription_id": str(sub.id),
                    "invoice_id": str(invoice.id),
                    "days_overdue": days_overdue,
                })

    await db.commit()
    return actions
