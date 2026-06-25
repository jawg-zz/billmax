import uuid
from datetime import date, datetime

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.subscription import Subscription
from app.models.notification import Notification
from app.models.organization import Organization
from app.models.payment import Payment
from app.schemas.invoice import InvoiceCreate
from app.services.pdf_service import render_email_template, render_invoice_pdf
from app.services.email_service import send_email
from app.services.sequence_service import next_invoice_number
from app.services.tax import calculate_total_with_vat


class InvoiceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_invoice(
        self,
        data: InvoiceCreate,
        organization_id: uuid.UUID,
    ) -> Invoice:
        subtotal = sum(item.unit_price * item.quantity for item in data.items)
        total, vat_amount = calculate_total_with_vat(subtotal)

        invoice_number = await next_invoice_number(self.db, organization_id)

        invoice = Invoice(
            organization_id=organization_id,
            customer_id=data.customer_id,
            subscription_id=data.subscription_id,
            invoice_number=invoice_number,
            issue_date=data.issue_date,
            due_date=data.due_date,
            subtotal=subtotal,
            vat_amount=vat_amount,
            total=total,
            balance_due=total,
            status="draft",
            notes=data.notes,
        )
        self.db.add(invoice)
        await self.db.flush()

        for item_data in data.items:
            item_total = item_data.unit_price * item_data.quantity
            item_tax = 0.0
            if item_data.is_taxable:
                _, item_tax = calculate_total_with_vat(item_total)

            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total=item_total,
                is_taxable=item_data.is_taxable,
                tax_rate=16.00 if item_data.is_taxable else 0.0,
                tax_amount=item_tax,
            )
            self.db.add(item)

        # Recompute aggregate VAT and total from per-item sums to avoid rounding drift
        item_tax_sum = sum(
            calculate_total_with_vat(item_data.unit_price * item_data.quantity)[1]
            if item_data.is_taxable else 0.0
            for item_data in data.items
        )
        invoice.vat_amount = round(item_tax_sum, 2)
        invoice.total = round(invoice.subtotal + invoice.vat_amount, 2)
        invoice.balance_due = invoice.total

        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    async def get_invoice(
        self, invoice_id: uuid.UUID, organization_id: uuid.UUID
    ) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice).options(selectinload(Invoice.items)).where(
                Invoice.id == invoice_id,
                Invoice.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_invoices(
        self,
        organization_id: uuid.UUID,
        status: str | None = None,
        customer_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Invoice]:
        query = select(Invoice).options(selectinload(Invoice.items)).where(
            Invoice.organization_id == organization_id
        )
        if status:
            query = query.where(Invoice.status == status)
        if customer_id:
            query = query.where(Invoice.customer_id == customer_id)
        query = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_sent(self, invoice_id: uuid.UUID) -> Invoice | None:
        result = await self.db.execute(select(Invoice).where(Invoice.id == invoice_id))
        invoice = result.scalar_one_or_none()
        if invoice and invoice.status == "draft":
            invoice.status = "sent"
            await self.db.commit()
            await self.db.refresh(invoice)
        return invoice

    async def record_payment(
        self,
        invoice_id: uuid.UUID,
        amount: float,
        payment_method: str,
        organization_id: uuid.UUID,
        transaction_code: str | None = None,
        notes: str | None = None,
    ) -> Payment | None:
        result = await self.db.execute(
            select(Invoice).where(
                Invoice.id == invoice_id,
                Invoice.organization_id == organization_id,
            )
        )
        invoice = result.scalar_one_or_none()
        if not invoice:
            return None

        payment = Payment(
            organization_id=invoice.organization_id,
            customer_id=invoice.customer_id,
            invoice_id=invoice.id,
            amount=amount,
            payment_method=payment_method,
            transaction_code=transaction_code,
            status="completed",
            notes=notes,
        )
        self.db.add(payment)

        previous_balance = float(invoice.balance_due)
        invoice.balance_due = max(0.0, previous_balance - amount)
        overpayment = max(0.0, amount - previous_balance)
        if invoice.balance_due == 0.0:
            invoice.status = "paid"
            if overpayment > 0:
                payment.notes = (notes or "") + f" (Overpayment of {overpayment:.2f} KES)"
        elif invoice.status != "partially_paid":
            invoice.status = "partially_paid"

        await self.db.commit()
        await self.db.refresh(payment)

        if invoice.balance_due == 0.0 and invoice.subscription_id:
            sub_result = await self.db.execute(
                select(Subscription).where(Subscription.id == invoice.subscription_id)
            )
            sub = sub_result.scalar_one_or_none()
            if sub and sub.status == "suspended":
                sub.status = "active"
                await self.db.commit()

        return payment

    async def send_invoice_email(
        self, invoice_id: uuid.UUID, organization_id: uuid.UUID
    ) -> bool:
        invoice = await self.get_invoice(invoice_id, organization_id)
        if not invoice:
            return False

        org_result = await self.db.execute(
            select(Organization).where(Organization.id == organization_id)
        )
        org = org_result.scalar_one_or_none()
        if not org:
            return False

        cust_result = await self.db.execute(
            select(Customer).where(Customer.id == invoice.customer_id)
        )
        customer = cust_result.scalar_one_or_none()
        if not customer.email:
            return False

        items_result = await self.db.execute(
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

        html_body = render_email_template(
            "invoice_sent.html",
            invoice_number=invoice.invoice_number,
            customer_name=f"{customer.first_name} {customer.last_name}",
            total=float(invoice.total),
            due_date=invoice.due_date.isoformat(),
            items=[{"description": i.description, "total": float(i.total)} for i in items],
            org_name=org.name,
        )

        sent = await send_email(
            to=customer.email,
            subject=f"Invoice {invoice.invoice_number} from {org.name}",
            html_body=html_body,
            attachments=[(pdf_bytes, f"Invoice_{invoice.invoice_number}.pdf", "pdf")],
        )

        notification = Notification(
            organization_id=organization_id,
            customer_id=customer.id,
            recipient=customer.email,
            subject=f"Invoice {invoice.invoice_number}",
            body=html_body,
            channel="email",
            status="sent" if sent else "failed",
            sent_at=datetime.utcnow() if sent else None,
            error_message=None if sent else "SMTP failed",
        )
        self.db.add(notification)
        await self.db.commit()

        if sent:
            await self.mark_sent(invoice.id)

        return sent

    async def count_by_status(
        self, organization_id: uuid.UUID, status: str
    ) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Invoice.organization_id == organization_id,
                Invoice.status == status,
            )
        )
        return result.scalar() or 0

    async def total_outstanding(
        self, organization_id: uuid.UUID
    ) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(Invoice.balance_due), 0)).where(
                Invoice.organization_id == organization_id,
                Invoice.status.in_(["sent", "overdue", "partially_paid"]),
            )
        )
        return float(result.scalar() or 0)
