import asyncio
import uuid

from app.database import async_session
from app.models.organization import Organization
from app.models.user import User
from app.models.plan import Plan
from app.models.customer import Customer
from app.models.subscription import Subscription
from app.utils.security import hash_password
from datetime import date, timedelta


async def seed():
    async with async_session() as db:
        org = Organization(
            id=uuid.uuid4(),
            name="BillMax Demo ISP",
            address="123 Kenyatta Avenue, Nairobi",
            phone="+254700000000",
            email="info@billmax.ke",
            kra_pin="P051234567Z",
        )
        db.add(org)
        await db.flush()

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
        await db.flush()

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

        plans_data = [
            Plan(organization_id=org.id, name="Fiber 10Mbps", type="fiber", download_speed_mbps=10, upload_speed_mbps=10, price=2500, billing_cycle="monthly"),
            Plan(organization_id=org.id, name="Fiber 20Mbps", type="fiber", download_speed_mbps=20, upload_speed_mbps=20, price=3500, billing_cycle="monthly"),
            Plan(organization_id=org.id, name="Fiber 50Mbps", type="fiber", download_speed_mbps=50, upload_speed_mbps=25, price=5500, billing_cycle="monthly"),
            Plan(organization_id=org.id, name="Wireless 5Mbps", type="wireless", download_speed_mbps=5, upload_speed_mbps=2, price=1500, billing_cycle="monthly"),
            Plan(organization_id=org.id, name="Wireless 10Mbps", type="wireless", download_speed_mbps=10, upload_speed_mbps=5, price=2500, billing_cycle="monthly"),
            Plan(organization_id=org.id, name="LTE Home", type="lte", download_speed_mbps=15, upload_speed_mbps=5, price=2000, billing_cycle="monthly"),
            Plan(organization_id=org.id, name="Business 100Mbps", type="fiber", download_speed_mbps=100, upload_speed_mbps=50, price=15000, billing_cycle="monthly"),
        ]
        for plan in plans_data:
            db.add(plan)
        await db.flush()

        customers_data = [
            Customer(organization_id=org.id, first_name="John", last_name="Kamau", phone="+254712345678", email="john@example.com", id_number="12345678", status="active"),
            Customer(organization_id=org.id, first_name="Mary", last_name="Wanjiku", phone="+254723456789", email="mary@example.com", id_number="23456789", status="active"),
            Customer(organization_id=org.id, first_name="Peter", last_name="Otieno", phone="+254734567890", email="peter@example.com", id_number="34567890", status="active"),
            Customer(organization_id=org.id, first_name="James", last_name="Kiprop", phone="+254745678901", email="james@example.com", id_number="45678901", status="suspended"),
            Customer(organization_id=org.id, first_name="Sarah", last_name="Njoki", phone="+254756789012", email="sarah@example.com", id_number="56789012", status="active"),
        ]
        for cust in customers_data:
            db.add(cust)
        await db.flush()

        today = date.today()
        subs_data = [
            Subscription(organization_id=org.id, customer_id=customers_data[0].id, plan_id=plans_data[1].id, status="active", next_billing_date=today + timedelta(days=5)),
            Subscription(organization_id=org.id, customer_id=customers_data[1].id, plan_id=plans_data[2].id, status="active", next_billing_date=today + timedelta(days=12)),
            Subscription(organization_id=org.id, customer_id=customers_data[2].id, plan_id=plans_data[0].id, status="active", next_billing_date=today + timedelta(days=3)),
            Subscription(organization_id=org.id, customer_id=customers_data[3].id, plan_id=plans_data[3].id, status="suspended", next_billing_date=today - timedelta(days=35)),
            Subscription(organization_id=org.id, customer_id=customers_data[4].id, plan_id=plans_data[5].id, status="active", next_billing_date=today + timedelta(days=20)),
        ]
        for sub in subs_data:
            db.add(sub)

        await db.commit()

    print("Seed complete!")
    print(f"  Organization: {org.name}")
    print(f"  Admin:     admin@billmax.ke / admin123")
    print(f"  Billing:   billing@billmax.ke / billing123")
    print(f"  Support:   support@billmax.ke / support123")
    print(f"  Plans:     {len(plans_data)} created")
    print(f"  Customers: {len(customers_data)} created")
    print(f"  Subscriptions: {len(subs_data)} created")


if __name__ == "__main__":
    asyncio.run(seed())
