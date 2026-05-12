from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.services.sequence_service import next_invoice_number
from app.services.tax import calculate_total_with_vat


CYCLE_DAYS = {
    "monthly": 30,
    "quarterly": 90,
    "yearly": 365,
    "biannually": 180,
}


def _add_billing_cycle(current: date, cycle: str) -> date:
    mapping = {
        "monthly": relativedelta(months=1),
        "quarterly": relativedelta(months=3),
        "yearly": relativedelta(years=1),
        "biannually": relativedelta(months=6),
    }
    delta = mapping.get(cycle, relativedelta(months=1))
    return current + delta


def _calculate_prorated_price(
    price: float,
    cycle: str,
    start_date: date,
    next_billing_date: date,
) -> float:
    days_in_cycle = CYCLE_DAYS.get(cycle, 30)
    billing_start = start_date if start_date > next_billing_date else next_billing_date
    days_until_next_billing = (next_billing_date - billing_start).days
    if days_until_next_billing <= 0:
        return price
    remaining_days = days_until_next_billing
    daily_rate = price / days_in_cycle
    return round(remaining_days * daily_rate, 2)


async def run_billing(
    db: AsyncSession,
    organization_id: uuid.UUID,
    target_date: date | None = None,
) -> list[Invoice]:
    target = target_date or date.today()

    result = await db.execute(
        select(Subscription).where(
            Subscription.organization_id == organization_id,
            Subscription.status == "active",
            Subscription.next_billing_date <= target,
        )
    )
    subscriptions = result.scalars().all()
    created_invoices: list[Invoice] = []

    for sub in subscriptions:
        plan_result = await db.execute(
            select(Plan).where(Plan.id == sub.plan_id)
        )
        plan = plan_result.scalar_one()

        cust_result = await db.execute(
            select(Customer).where(Customer.id == sub.customer_id)
        )
        customer = cust_result.scalar_one()
        if not customer:
            continue

        invoice = await _generate_invoice(
            db, organization_id, sub, plan, customer, target
        )
        if invoice:
            sub.next_billing_date = _add_billing_cycle(target, plan.billing_cycle)
            created_invoices.append(invoice)

    await db.commit()
    for inv in created_invoices:
        await db.refresh(inv)
    return created_invoices


async def _generate_invoice(
    db: AsyncSession,
    organization_id: uuid.UUID,
    subscription: Subscription,
    plan: Plan,
    customer: Customer,
    issue_date: date,
) -> Invoice | None:
    due_date = issue_date + timedelta(days=7)
    price = float(plan.price)

    # Prorate if this is the first billing or mid-cycle
    if subscription.start_date.date() > subscription.next_billing_date:
        price = _calculate_prorated_price(
            price, plan.billing_cycle,
            subscription.start_date.date(),
            subscription.next_billing_date,
        )

    invoice_number = await next_invoice_number(db, organization_id)
    try:
        total, vat_amount = calculate_total_with_vat(price, taxable=plan.is_taxable)
    except Exception:
        total, vat_amount = price, 0.0

    invoice = Invoice(
        organization_id=organization_id,
        customer_id=customer.id,
        subscription_id=subscription.id,
        invoice_number=invoice_number,
        issue_date=issue_date,
        due_date=due_date,
        subtotal=price,
        vat_amount=vat_amount,
        total=total,
        balance_due=total,
        status="draft",
    )
    db.add(invoice)
    await db.flush()

    item = InvoiceItem(
        invoice_id=invoice.id,
        description=f"{plan.name} ({plan.download_speed_mbps}/{plan.upload_speed_mbps} Mbps) - {plan.billing_cycle}",
        quantity=1,
        unit_price=price,
        total=price,
        is_taxable=plan.is_taxable,
        tax_rate=16.00 if plan.is_taxable else 0.0,
        tax_amount=vat_amount,
    )
    db.add(item)

    # Add setup fee on first invoice
    if plan.setup_fee > 0:
        setup_price = float(plan.setup_fee)
        setup_item = InvoiceItem(
            invoice_id=invoice.id,
            description=f"Setup fee - {plan.name}",
            quantity=1,
            unit_price=setup_price,
            total=setup_price,
            is_taxable=True,
            tax_rate=16.00,
            tax_amount=0.0,
        )
        db.add(setup_item)
        invoice.subtotal = float(invoice.subtotal) + setup_price
        invoice.total = float(invoice.total) + setup_price
        invoice.balance_due = float(invoice.balance_due) + setup_price

    return invoice


async def preview_billing(
    db: AsyncSession,
    organization_id: uuid.UUID,
    target_date: date | None = None,
) -> list[dict]:
    target = target_date or date.today()

    result = await db.execute(
        select(Subscription).where(
            Subscription.organization_id == organization_id,
            Subscription.status == "active",
            Subscription.next_billing_date <= target,
        )
    )
    subscriptions = result.scalars().all()
    preview: list[dict] = []

    for sub in subscriptions:
        plan_result = await db.execute(
            select(Plan).where(Plan.id == sub.plan_id)
        )
        plan = plan_result.scalar_one()

        cust_result = await db.execute(
            select(Customer).where(Customer.id == sub.customer_id)
        )
        customer = cust_result.scalar_one()
        if not customer:
            continue

        price = float(plan.price)
        if sub.start_date.date() > sub.next_billing_date:
            price = _calculate_prorated_price(
                price, plan.billing_cycle,
                sub.start_date.date(),
                sub.next_billing_date,
            )

        total, vat = calculate_total_with_vat(price, taxable=plan.is_taxable)
        preview.append({
            "customer_name": f"{customer.first_name} {customer.last_name}",
            "customer_id": str(customer.id),
            "plan_name": plan.name,
            "price": price,
            "vat": vat,
            "total": total,
            "next_billing": sub.next_billing_date.isoformat(),
        })

    return preview
