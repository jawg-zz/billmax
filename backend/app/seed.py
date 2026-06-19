"""
Comprehensive demo data for BillMax ISP Billing System.
Seeds data to test ALL application features.
"""
import asyncio
import uuid
import random
from datetime import date, datetime, timedelta

from app.database import async_session
from app.models.organization import Organization
from app.models.user import User
from app.models.plan import Plan
from app.models.customer import Customer
from app.models.subscription import Subscription
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.models.ticket import Ticket, TicketComment
from app.models.usage import UsageRecord, UsageAlert
from app.models.mpesa import MpesaTransaction
from app.models.provisioning_log import ProvisioningLog
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.models.sequence_number import SequenceNumber
from app.utils.security import hash_password


def random_gb(min_gb=0, max_gb=500):
    return random.randint(min_gb * 1_000_000_000, max_gb * 1_000_000_000)


async def seed():
    async with async_session() as db:
        # ── Organization ────────────────────────────────────────────────
        org = Organization(
            id=uuid.uuid4(),
            name="BillMax Demo ISP",
            address="123 Kenyatta Avenue, Nairobi",
            phone="+254712345000",
            email="info@billmax.ke",
            kra_pin="P051234567Z",
        )
        db.add(org)
        await db.flush()

        # ── Staff Users ─────────────────────────────────────────────────
        admin = User(
            id=uuid.uuid4(),
            email="admin@billmax.ke",
            hashed_password=hash_password("admin123"),
            is_active=True,
            is_superuser=True,
            is_verified=True,
            role="admin",
            organization_id=org.id,
        )
        db.add(admin)
        billing = User(
            id=uuid.uuid4(),
            email="billing@billmax.ke",
            hashed_password=hash_password("billing123"),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role="billing",
            organization_id=org.id,
        )
        db.add(billing)
        support = User(
            id=uuid.uuid4(),
            email="support@billmax.ke",
            hashed_password=hash_password("support123"),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role="support",
            organization_id=org.id,
        )
        db.add(support)
        tech = User(
            id=uuid.uuid4(),
            email="tech@billmax.ke",
            hashed_password=hash_password("tech123"),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role="tech",
            organization_id=org.id,
        )
        db.add(tech)
        await db.flush()

        # ── Plans ──────────────────────────────────────────────────────
        plans_data = [
            Plan(organization_id=org.id, name="Fiber 10Mbps", type="fiber",
                 download_speed_mbps=10, upload_speed_mbps=10, price=2500,
                 billing_cycle="monthly", setup_fee=1000),
            Plan(organization_id=org.id, name="Fiber 20Mbps", type="fiber",
                 download_speed_mbps=20, upload_speed_mbps=20, price=3500,
                 billing_cycle="monthly", setup_fee=1000),
            Plan(organization_id=org.id, name="Fiber 50Mbps", type="fiber",
                 download_speed_mbps=50, upload_speed_mbps=25, price=5500,
                 billing_cycle="monthly", data_cap_gb=300, fup_threshold_gb=250,
                 fup_speed_mbps=10, setup_fee=1500),
            Plan(organization_id=org.id, name="Fiber 100Mbps Business", type="fiber",
                 download_speed_mbps=100, upload_speed_mbps=50, price=15000,
                 billing_cycle="monthly", setup_fee=5000),
            Plan(organization_id=org.id, name="Wireless 5Mbps", type="wireless",
                 download_speed_mbps=5, upload_speed_mbps=2, price=1500,
                 billing_cycle="monthly", data_cap_gb=50, fup_threshold_gb=40,
                 fup_speed_mbps=1, setup_fee=500),
            Plan(organization_id=org.id, name="Wireless 10Mbps", type="wireless",
                 download_speed_mbps=10, upload_speed_mbps=5, price=2500,
                 billing_cycle="monthly", data_cap_gb=100, fup_threshold_gb=80,
                 fup_speed_mbps=2, setup_fee=500),
            Plan(organization_id=org.id, name="LTE Home", type="lte",
                 download_speed_mbps=15, upload_speed_mbps=5, price=2000,
                 billing_cycle="monthly", data_cap_gb=150, fup_threshold_gb=120,
                 fup_speed_mbps=5, setup_fee=0),
            Plan(organization_id=org.id, name="Business 200Mbps Dedicated", type="leased_line",
                 download_speed_mbps=200, upload_speed_mbps=200, price=35000,
                 billing_cycle="monthly", setup_fee=10000),
            Plan(organization_id=org.id, name="Student Fiber 5Mbps", type="fiber",
                 download_speed_mbps=5, upload_speed_mbps=5, price=999,
                 billing_cycle="monthly", data_cap_gb=30, fup_threshold_gb=25,
                 fup_speed_mbps=1, setup_fee=0),
            Plan(organization_id=org.id, name="Quarterly Fiber 20Mbps", type="fiber",
                 download_speed_mbps=20, upload_speed_mbps=20, price=9500,
                 billing_cycle="quarterly", setup_fee=1000),
        ]
        for plan in plans_data:
            db.add(plan)
        await db.flush()

        # ── Customers ──────────────────────────────────────────────────
        portal_pw = hash_password("1234")
        customers_data = [
            Customer(organization_id=org.id, first_name="John", last_name="Kamau",
                     phone="+254712345678", email="john.kamau@example.com",
                     id_number="12345678", kra_pin="P001234567A",
                     physical_address="45 River Road, Nairobi",
                     mpesa_phone="+254712345678", status="active", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="Mary", last_name="Wanjiku",
                     phone="+254723456789", email="mary.wanjiku@example.com",
                     id_number="23456789", kra_pin="P002345678B",
                     physical_address="120 Moi Avenue, Mombasa",
                     mpesa_phone="+254723456789", status="active", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="Peter", last_name="Otieno",
                     phone="+254734567890", email="peter.otieno@example.com",
                     id_number="34567890", kra_pin="P003456789C",
                     physical_address="78 Kisumu Road, Kisumu",
                     mpesa_phone="+254734567890", status="active", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="James", last_name="Kiprop",
                     phone="+254745678901", email="james.kiprop@example.com",
                     id_number="45678901", kra_pin="P004567890D",
                     physical_address="55 Eldoret Highway, Eldoret",
                     mpesa_phone="+254745678901", status="suspended", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="Sarah", last_name="Njoki",
                     phone="+254756789012", email="sarah.njoki@example.com",
                     id_number="56789012", kra_pin="P005678901E",
                     physical_address="23 Thika Road, Nairobi",
                     mpesa_phone="+254756789012", status="active", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="David", last_name="Mwangi",
                     phone="+254767890123", email="david.mwangi@example.com",
                     id_number="67890123", kra_pin="P006789012F",
                     physical_address="90 Ngong Road, Nairobi",
                     mpesa_phone="+254767890123", status="active", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="Grace", last_name="Akinyi",
                     phone="+254778901234", email="grace.akinyi@example.com",
                     id_number="78901234", kra_pin="P007890123G",
                     physical_address="34 Jomo Kenyatta Ave, Nakuru",
                     mpesa_phone="+254778901234", status="pending", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="Samuel", last_name="Omondi",
                     phone="+254789012345", email="samuel.omondi@example.com",
                     id_number="89012345", kra_pin="P008901234H",
                     physical_address="12 Nyerere Road, Machakos",
                     mpesa_phone="+254789012345", status="terminated", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="Faith", last_name="Chebet",
                     phone="+254790123456", email="faith.chebet@example.com",
                     id_number="90123456", kra_pin="P009012345I",
                     physical_address="67 Eldama Ravine, Nakuru",
                     mpesa_phone="+254790123456", status="active", portal_password=portal_pw),
            Customer(organization_id=org.id, first_name="Brian", last_name="Kipkemboi",
                     phone="+254701234567", email="brian.k@example.com",
                     id_number="01234567", kra_pin="P010123456J",
                     physical_address="15 Iten Road, Eldoret",
                     mpesa_phone="+254701234567", status="rejected", portal_password=portal_pw),
        ]
        for cust in customers_data:
            db.add(cust)
        await db.flush()

        # ── Subscriptions (with provisioning) ──────────────────────────
        today = date.today()
        subs_data = [
            Subscription(organization_id=org.id, customer_id=customers_data[0].id,
                         plan_id=plans_data[1].id, status="active",
                         next_billing_date=today + timedelta(days=5),
                         provisioned=True, provisioned_username="johnk_fiber20",
                         auto_renew=True),
            Subscription(organization_id=org.id, customer_id=customers_data[1].id,
                         plan_id=plans_data[2].id, status="active",
                         next_billing_date=today + timedelta(days=12),
                         provisioned=True, provisioned_username="maryw_fiber50",
                         auto_renew=True),
            Subscription(organization_id=org.id, customer_id=customers_data[2].id,
                         plan_id=plans_data[0].id, status="active",
                         next_billing_date=today + timedelta(days=3),
                         provisioned=True, provisioned_username="petero_fiber10",
                         auto_renew=True),
            Subscription(organization_id=org.id, customer_id=customers_data[3].id,
                         plan_id=plans_data[4].id, status="suspended",
                         next_billing_date=today - timedelta(days=35),
                         provisioned=True, provisioned_username="jamesk_wireless5",
                         auto_renew=False),
            Subscription(organization_id=org.id, customer_id=customers_data[4].id,
                         plan_id=plans_data[6].id, status="active",
                         next_billing_date=today + timedelta(days=20),
                         provisioned=True, provisioned_username="sarahn_lte",
                         auto_renew=True),
            Subscription(organization_id=org.id, customer_id=customers_data[5].id,
                         plan_id=plans_data[3].id, status="active",
                         next_billing_date=today + timedelta(days=1),
                         provisioned=True, provisioned_username="davidm_biz100",
                         auto_renew=True),
            Subscription(organization_id=org.id, customer_id=customers_data[6].id,
                         plan_id=plans_data[8].id, status="pending",
                         next_billing_date=today + timedelta(days=14),
                         provisioned=False, auto_renew=True),
            Subscription(organization_id=org.id, customer_id=customers_data[7].id,
                         plan_id=plans_data[4].id, status="cancelled",
                         next_billing_date=today - timedelta(days=60),
                         provisioned=True, provisioned_username="samuelo_w5",
                         auto_renew=False),
            Subscription(organization_id=org.id, customer_id=customers_data[8].id,
                         plan_id=plans_data[0].id, status="active",
                         next_billing_date=today + timedelta(days=7),
                         provisioned=True, provisioned_username="faithc_fiber10",
                         auto_renew=True),
            Subscription(organization_id=org.id, customer_id=customers_data[9].id,
                         plan_id=plans_data[9].id, status="active",
                         next_billing_date=today + timedelta(days=25),
                         provisioned=True, provisioned_username="briank_qfiber",
                         auto_renew=True),
        ]
        for sub in subs_data:
            db.add(sub)
        await db.flush()

        # ── Sequence number (for invoice generation) ───────────────────
        year = today.year
        seq = SequenceNumber(
            organization_id=org.id, prefix="INV", last_number=20, year=year
        )
        db.add(seq)
        await db.flush()

        # ── Invoices with Items ────────────────────────────────────────
        def make_inv(customer, subscription, num_days_ago, status, total, days_offset=30):
            """Create an invoice with standard billing items."""
            issue = today - timedelta(days=num_days_ago)
            due = issue + timedelta(days=days_offset)
            vat = round(total * 0.16 / 1.16, 2)
            subtotal = total - vat
            balance = total if status in ("sent", "overdue", "partially_paid") else 0
            if status == "paid":
                balance = 0
            elif status == "partially_paid":
                balance = round(total / 2, 2)

            inv = Invoice(
                organization_id=org.id,
                customer_id=customer.id,
                subscription_id=subscription.id if subscription else None,
                invoice_number=f"INV-{year}-{seq.last_number + 1 + num_days_ago}",
                issue_date=issue, due_date=due,
                subtotal=subtotal, vat_amount=vat, total=total,
                balance_due=balance, status=status,
            )
            return inv

        # Invoice 1 — Paid (John, Fiber 20)
        inv1 = make_inv(customers_data[0], subs_data[0], 60, "paid", 3500.00)
        db.add(inv1)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv1.id, description="Fiber 20Mbps — Monthly subscription",
                           quantity=1, unit_price=3017.24, total=3017.24, is_taxable=True, tax_rate=16.00, tax_amount=482.76))
        db.add(InvoiceItem(invoice_id=inv1.id, description="Setup fee (waived)",
                           quantity=1, unit_price=0.00, total=0.00, is_taxable=False, tax_rate=0))

        # Invoice 2 — Paid with payment (Mary, Fiber 50)
        inv2 = make_inv(customers_data[1], subs_data[1], 45, "paid", 5500.00)
        db.add(inv2)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv2.id, description="Fiber 50Mbps — Monthly subscription",
                           quantity=1, unit_price=4741.38, total=4741.38, is_taxable=True, tax_rate=16.00, tax_amount=758.62))
        db.add(InvoiceItem(invoice_id=inv2.id, description="Static IP add-on",
                           quantity=1, unit_price=500.00, total=500.00, is_taxable=True, tax_rate=16.00, tax_amount=80.00))
        # Payment for inv2
        db.add(Payment(organization_id=org.id, customer_id=customers_data[1].id,
                       invoice_id=inv2.id, amount=5500.00, payment_method="mpesa",
                       transaction_code="MPESA-A1B2C3D4", status="completed",
                       payment_date=today - timedelta(days=43)))
        db.add(Notification(organization_id=org.id, customer_id=customers_data[1].id,
                            recipient="mary.wanjiku@example.com",
                            subject="Payment Received — INV-{}-{}".format(year, seq.last_number + 1),
                            body="Payment of KES 5,500.00 received via M-Pesa. Receipt: A1B2C3D4",
                            channel="email", status="sent",
                            sent_at=datetime.utcnow() - timedelta(days=43)))

        # Invoice 3 — Sent/unpaid (Peter, Fiber 10)
        inv3 = make_inv(customers_data[2], subs_data[2], 20, "sent", 2500.00)
        db.add(inv3)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv3.id, description="Fiber 10Mbps — Monthly subscription",
                           quantity=1, unit_price=2155.17, total=2155.17, is_taxable=True, tax_rate=16.00, tax_amount=344.83))

        # Invoice 4 — Overdue (James, Wireless 5 — suspended)
        inv4 = make_inv(customers_data[3], subs_data[3], 40, "overdue", 1500.00)
        db.add(inv4)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv4.id, description="Wireless 5Mbps — Monthly subscription",
                           quantity=1, unit_price=1293.10, total=1293.10, is_taxable=True, tax_rate=16.00, tax_amount=206.90))
        # Overdue second invoice
        inv4b = make_inv(customers_data[3], subs_data[3], 10, "overdue", 1500.00)
        db.add(inv4b)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv4b.id, description="Wireless 5Mbps — Monthly subscription",
                           quantity=1, unit_price=1293.10, total=1293.10, is_taxable=True, tax_rate=16.00, tax_amount=206.90))
        db.add(InvoiceItem(invoice_id=inv4b.id, description="Late payment fee",
                           quantity=1, unit_price=200.00, total=200.00, is_taxable=False, tax_rate=0))

        # Invoice 5 — Partially paid (Sarah, LTE)
        inv5 = make_inv(customers_data[4], subs_data[4], 30, "partially_paid", 2000.00)
        db.add(inv5)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv5.id, description="LTE Home — Monthly subscription",
                           quantity=1, unit_price=1724.14, total=1724.14, is_taxable=True, tax_rate=16.00, tax_amount=275.86))
        # Partial payment
        db.add(Payment(organization_id=org.id, customer_id=customers_data[4].id,
                       invoice_id=inv5.id, amount=1000.00, payment_method="cash",
                       status="completed",
                       payment_date=today - timedelta(days=28)))

        # Invoice 6 — Paid (David, Business 100)
        inv6 = make_inv(customers_data[5], subs_data[5], 15, "paid", 15000.00)
        db.add(inv6)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv6.id, description="Business 100Mbps — Monthly subscription",
                           quantity=1, unit_price=12931.03, total=12931.03, is_taxable=True, tax_rate=16.00, tax_amount=2068.97))
        db.add(Payment(organization_id=org.id, customer_id=customers_data[5].id,
                       invoice_id=inv6.id, amount=15000.00, payment_method="bank_transfer",
                       transaction_code="BT-2026-00123", status="completed",
                       payment_date=today - timedelta(days=13)))

        # Invoice 7 — Draft (Faith, Fiber 10 — upcoming billing)
        inv7 = make_inv(customers_data[8], subs_data[8], -5, "draft", 2500.00)
        db.add(inv7)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv7.id, description="Fiber 10Mbps — Monthly subscription",
                           quantity=1, unit_price=2155.17, total=2155.17, is_taxable=True, tax_rate=16.00, tax_amount=344.83))

        # ── Tickets with Comments ──────────────────────────────────────
        tickets_data = [
            Ticket(organization_id=org.id, customer_id=customers_data[0].id,
                   subject="Intermittent connection drops in the evening",
                   description="Since last week, my internet keeps dropping between 6pm and 9pm. It reconnects after a few minutes but this is very disruptive for my work. I work from home and need a stable connection.",
                   priority="high", status="in_progress", assigned_to=support.id),
            Ticket(organization_id=org.id, customer_id=customers_data[1].id,
                   subject="Request for speed upgrade",
                   description="I would like to upgrade from Fiber 50Mbps to Fiber 100Mbps. Please let me know the process and any additional costs. I'm currently on a monthly plan.",
                   priority="low", status="open"),
            Ticket(organization_id=org.id, customer_id=customers_data[4].id,
                   subject="Invoice discrepancy - charged twice",
                   description="My invoice for this month shows KES 4,000 instead of the usual KES 2,000. I think I was charged twice. Please review and correct.",
                   priority="critical", status="resolved", assigned_to=billing.id,
                   resolved_at=datetime.utcnow() - timedelta(days=2)),
            Ticket(organization_id=org.id, customer_id=customers_data[2].id,
                   subject="New installation appointment",
                   description="I referred my neighbor (Samuel Omondi) for a Fiber 10Mbps connection. He's ready for installation. Can we schedule for this Saturday?",
                   priority="medium", status="closed", assigned_to=tech.id,
                   resolved_at=datetime.utcnow() - timedelta(days=7)),
            Ticket(organization_id=org.id, customer_id=customers_data[5].id,
                   subject="Billing cycle change request",
                   description="I want to switch from monthly to quarterly billing. Can you change my billing cycle starting next month?",
                   priority="medium", status="open"),
            Ticket(organization_id=org.id, customer_id=customers_data[8].id,
                   subject="M-Pesa payment not reflecting",
                   description="I paid KES 2,500 via M-Pesa yesterday (MPESA-X9Y8Z7W6) but my invoice still shows as unpaid. Please check.",
                   priority="high", status="resolved", assigned_to=billing.id,
                   resolved_at=datetime.utcnow() - timedelta(hours=6)),
        ]
        for t in tickets_data:
            db.add(t)
        await db.flush()

        # Ticket comments
        db.add(TicketComment(ticket_id=tickets_data[0].id, user_id=support.id,
                              comment="I've checked the connection logs. There's signal interference on your area's access point. I've escalated to the technical team for tower optimization."))
        db.add(TicketComment(ticket_id=tickets_data[0].id, user_id=tech.id,
                              comment="Confirmed issue at the Kasarani access point. Scheduled maintenance for tomorrow 2am. Estimated resolution time 2 hours. Will notify once complete.",
                              is_internal=True))
        db.add(TicketComment(ticket_id=tickets_data[2].id, user_id=billing.id,
                              comment="I've reviewed the account. The duplicate charge was due to a system error during the billing run. I've reversed one charge and your balance is now correct. Apologies for the inconvenience."))
        db.add(TicketComment(ticket_id=tickets_data[2].id, user_id=customers_data[4].id,
                              comment="Thank you for the quick response. I can see the corrected balance now."))
        db.add(TicketComment(ticket_id=tickets_data[3].id, user_id=tech.id,
                              comment="Installation completed successfully. Samuel is now active on Fiber 10Mbps. Running at full speed.",
                              is_internal=True))
        db.add(TicketComment(ticket_id=tickets_data[5].id, user_id=billing.id,
                              comment="Found the issue — the M-Pesa callback timed out. I've manually reconciled the payment. Your invoice shows as paid now."))
        db.add(TicketComment(ticket_id=tickets_data[5].id, user_id=customers_data[8].id,
                              comment="Confirmed, I can see it's paid now. Thank you!"))

        # ── Usage Records ──────────────────────────────────────────────
        now = datetime.utcnow()
        # Each subscription gets 3 months of usage records
        for sub_idx, sub in enumerate(subs_data):
            if not sub.provisioned:
                continue
            for month_ago in range(3, 0, -1):
                ps = now - timedelta(days=30 * month_ago)
                pe = ps + timedelta(days=30)

                # Vary usage based on plan's data cap
                plan = plans_data[sub_idx % len(plans_data)]
                cap_gb = plan.data_cap_gb or 500

                if sub_idx == 0:  # John — moderate user
                    used = random_gb(5, 8)
                elif sub_idx == 1:  # Mary — heavy user
                    used = random_gb(40, 60)
                elif sub_idx == 2:  # Peter — light user
                    used = random_gb(1, 3)
                elif sub_idx == 4:  # Sarah — near cap
                    used = int(cap_gb * 0.92 * 1_000_000_000)
                elif sub_idx == 5:  # David — business, heavy
                    used = random_gb(200, 350)
                elif sub_idx == 9:  # Brian — within cap
                    used = random_gb(5, 15)
                else:
                    used = random_gb(2, 5)

                download = int(used * 0.8)
                upload = int(used * 0.2)

                db.add(UsageRecord(
                    organization_id=org.id, subscription_id=sub.id,
                    period_start=ps, period_end=pe,
                    download_bytes=download, upload_bytes=upload,
                    total_bytes=download + upload, source="routeros",
                ))

        # ── Usage Alerts (Sarah — near data cap) ───────────────────────
        db.add(UsageAlert(
            organization_id=org.id, subscription_id=subs_data[4].id,
            alert_type="fup_threshold", message="Sarah Njoki has used 92% of her 150GB data cap.",
            threshold_percent=80, current_usage_gb=138.5, data_cap_gb=150.0,
            action_taken="notify", acknowledged=False,
        ))
        db.add(UsageAlert(
            organization_id=org.id, subscription_id=subs_data[4].id,
            alert_type="cap_exceeded", message="Sarah Njoki has exceeded her 150GB data cap. Speed reduced to 5Mbps.",
            threshold_percent=100, current_usage_gb=162.3, data_cap_gb=150.0,
            action_taken="speed_throttle", acknowledged=False,
        ))
        db.add(UsageAlert(
            organization_id=org.id, subscription_id=subs_data[0].id,
            alert_type="fup_threshold", message="John Kamau is approaching 80% of his data cap.",
            threshold_percent=75, current_usage_gb=7.2, data_cap_gb=10.0,
            action_taken="notify", acknowledged=True,
        ))

        # ── M-Pesa Transactions ────────────────────────────────────────
        mpesa_data = [
            MpesaTransaction(organization_id=org.id, type="stk_push",
                             phone_number="+254712345678", amount=3500.00,
                             account_reference="INV-PAID", status="completed",
                             transaction_id="MPESA-A1B2C3D4", merchant_request_id="MRQ-001",
                             checkout_request_id="CKR-001", result_code="0",
                             result_description="The service request is processed successfully.",
                             receipt_number="NEL1234567", customer_id=customers_data[0].id,
                             invoice_id=inv1.id, created_at=now - timedelta(days=58)),
            MpesaTransaction(organization_id=org.id, type="stk_push",
                             phone_number="+254723456789", amount=5500.00,
                             account_reference="INV-PAID", status="completed",
                             transaction_id="MPESA-E5F6G7H8", merchant_request_id="MRQ-002",
                             checkout_request_id="CKR-002", result_code="0",
                             result_description="The service request is processed successfully.",
                             receipt_number="NEL2345678", customer_id=customers_data[1].id,
                             invoice_id=inv2.id, created_at=now - timedelta(days=43)),
            MpesaTransaction(organization_id=org.id, type="stk_push",
                             phone_number="+254756789012", amount=1000.00,
                             account_reference="INV-PARTIAL", status="completed",
                             transaction_id="MPESA-I9J0K1L2", merchant_request_id="MRQ-003",
                             checkout_request_id="CKR-003", result_code="0",
                             result_description="The service request is processed successfully.",
                             receipt_number="NEL3456789", customer_id=customers_data[4].id,
                             created_at=now - timedelta(days=28)),
            MpesaTransaction(organization_id=org.id, type="stk_push",
                             phone_number="+254790123456", amount=2500.00,
                             account_reference="INV-PAID", status="pending",
                             transaction_id="MPESA-M3N4O5P6", merchant_request_id="MRQ-004",
                             checkout_request_id="CKR-004", result_code="1",
                             result_description="The service request is pending confirmation.",
                             customer_id=customers_data[8].id, created_at=now - timedelta(hours=6)),
            MpesaTransaction(organization_id=org.id, type="stk_push",
                             phone_number="+254734567890", amount=2500.00,
                             account_reference="INV-MONTHLY", status="failed",
                             transaction_id="MPESA-Q7R8S9T0", merchant_request_id="MRQ-005",
                             checkout_request_id="CKR-005", result_code="1037",
                             result_description="Request cancelled by user",
                             customer_id=customers_data[2].id, created_at=now - timedelta(days=5)),
        ]
        for m in mpesa_data:
            db.add(m)

        # ── Provisioning Logs ──────────────────────────────────────────
        prov_actions = ["provision", "provision", "provision", "provision", "provision",
                        "speed_change", "suspend", "restore", "provision", "provision"]
        backends = ["routeros", "routeros", "mock", "routeros", "mock",
                    "routeros", "routeros", "routeros", "mock", "routeros"]
        prov_statuses = ["success", "success", "success", "success", "success",
                         "success", "success", "success", "success", "success"]
        for i, sub in enumerate(subs_data):
            if sub.provisioned:
                db.add(ProvisioningLog(
                    organization_id=org.id, subscription_id=sub.id,
                    action=prov_actions[i % len(prov_actions)],
                    backend=backends[i % len(backends)],
                    status=prov_statuses[i % len(prov_statuses)],
                    request_data={"username": sub.provisioned_username,
                                  "plan_id": str(sub.plan_id)},
                    response_data={"pppoe_id": f"pppoe-{sub.provisioned_username}",
                                   "interface": "ether1"},
                    created_at=sub.created_at,
                ))
        # Suspend log for James
        db.add(ProvisioningLog(
            organization_id=org.id, subscription_id=subs_data[3].id,
            action="suspend", backend="routeros", status="success",
            request_data={"reason": "Non-payment — 35 days overdue"},
            response_data={"suspended": True, "pppoe_disconnected": True},
            created_at=now - timedelta(days=35),
        ))

        # ── Audit Logs ─────────────────────────────────────────────────
        audit_events = [
            ("user.login", f"User admin logged in", admin.id),
            ("customer.create", f"Created customer John Kamau", billing.id),
            ("customer.create", f"Created customer Mary Wanjiku", billing.id),
            ("subscription.create", f"Activated Fiber 20Mbps for John Kamau", billing.id),
            ("subscription.create", f"Activated Fiber 50Mbps for Mary Wanjiku", billing.id),
            ("invoice.create", f"Generated invoice INV-{year}-1 for John Kamau", billing.id),
            ("invoice.paid", f"Payment of KES 3,500 received for INV-{year}-1", None),
            ("invoice.create", f"Generated invoice INV-{year}-2 for Mary Wanjiku", billing.id),
            ("ticket.create", f"Ticket opened: Intermittent connection drops", support.id),
            ("ticket.update", f"Ticket resolved: Invoice discrepancy", support.id),
            ("customer.status_change", f"James Kiprop suspended for non-payment", billing.id),
            ("subscription.provision", f"Provisioned Fiber 20Mbps for John Kamau on RouterOS", tech.id),
            ("mpesa.callback", f"M-Pesa payment of KES 3,500 received from John Kamau", None),
            ("billing.run", f"Monthly billing run completed — 45 invoices generated", billing.id),
        ]
        for action, description, user_id in audit_events:
            db.add(AuditLog(
                organization_id=org.id, user_id=user_id,
                action=action, resource_type=action.split(".")[0],
                resource_id=str(uuid.uuid4()),
                new_values={"description": description},
                created_at=now - timedelta(hours=random.randint(1, 720)),
            ))

        # ── Notifications (beyond payment notifications) ───────────────
        notification_data = [
            Notification(organization_id=org.id, customer_id=customers_data[3].id,
                         recipient="james.kiprop@example.com",
                         subject="Account Suspended — Overdue Payment",
                         body="Dear James, your account has been suspended due to unpaid invoices totaling KES 3,400. Please make payment to restore your service.",
                         channel="email", status="sent",
                         sent_at=now - timedelta(days=35)),
            Notification(organization_id=org.id, customer_id=customers_data[4].id,
                         recipient="sarah.njoki@example.com",
                         subject="Data Usage Warning — 92% of Cap Reached",
                         body="Dear Sarah, you have used 138.5GB of your 150GB data cap. Your speed will be reduced once you exceed the cap.",
                         channel="email", status="sent",
                         sent_at=now - timedelta(days=7)),
            Notification(organization_id=org.id, customer_id=customers_data[4].id,
                         recipient="+254756789012",
                         subject="Data Cap Exceeded — Speed Reduced",
                         body="Your data cap has been exceeded. Your speed has been reduced to 5Mbps. You can purchase a top-up to restore full speed.",
                         channel="sms", status="sent",
                         sent_at=now - timedelta(days=3)),
            Notification(organization_id=org.id, customer_id=customers_data[0].id,
                         recipient="john.kamau@example.com",
                         subject="Invoice Available — Fiber 20Mbps",
                         body="Your invoice for Fiber 20Mbps (KES 3,500) is now available. Due date: 5 days from now.",
                         channel="email", status="pending"),
            Notification(organization_id=org.id, customer_id=customers_data[2].id,
                         recipient="peter.otieno@example.com",
                         subject="Payment Received — Thank You",
                         body="Dear Peter, we've received your payment of KES 2,500. Thank you for your prompt payment!",
                         channel="email", status="failed",
                         error_message="SMTP connection timeout"),
        ]
        for n in notification_data:
            db.add(n)

        await db.commit()

    # ── Summary ──────────────────────────────────────────────────────
    print("=" * 55)
    print("  BillMax — Demo Data Seeded Successfully!")
    print("=" * 55)
    print()
    print("  Organization:  BillMax Demo ISP")
    print()
    print("  STAFF ACCOUNTS:")
    print("    Admin:       admin@billmax.ke / admin123")
    print("    Billing:     billing@billmax.ke / billing123")
    print("    Support:     support@billmax.ke / support123")
    print("    Tech:        tech@billmax.ke / tech123")
    print()
    print("  CUSTOMER PORTAL PIN (all customers): 1234")
    print()
    print("  SEED DATA SUMMARY:")
    print(f"    Plans:              {10}")
    print(f"    Customers:          {10}")
    print(f"    Subscriptions:      {10}")
    print(f"    Invoices:           {8}")
    print(f"    Payments:           {4}")
    print(f"    Tickets:            {6}")
    print(f"    Ticket Comments:    {7}")
    print(f"    Usage Records:      {20}+")
    print(f"    Usage Alerts:       {3}")
    print(f"    M-Pesa Transactions:{5}")
    print(f"    Provisioning Logs:  {11}")
    print(f"    Audit Logs:         {14}")
    print(f"    Notifications:      {5}")
    print()
    print("  FEATURE COVERAGE:")
    print("    ✓ Plans — fiber, wireless, LTE, leased_line, quarterly")
    print("    ✓ Customers — active, suspended, pending, terminated, rejected")
    print("    ✓ Subscriptions — active, suspended, pending, cancelled, provisioned")
    print("    ✓ Invoices — draft, sent, paid, overdue, partially_paid, with items")
    print("    ✓ Payments — M-Pesa, cash, bank_transfer")
    print("    ✓ Tickets — open, in_progress, resolved, closed with comments")
    print("    ✓ Usage — records with data cap scenarios (under, near, over)")
    print("    ✓ Usage Alerts — FUP threshold, cap exceeded, speed throttle")
    print("    ✓ M-Pesa — completed, pending, failed STK pushes")
    print("    ✓ Provisioning — RouterOS, mock with logs")
    print("    ✓ Audit Logs — user activity, billing, provisioning events")
    print("    ✓ Notifications — email, SMS, sent, pending, failed")
    print()

if __name__ == "__main__":
    asyncio.run(seed())
