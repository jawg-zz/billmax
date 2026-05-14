from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.billing import router as billing_router
from app.api.v1.customers import router as customers_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.mpesa import router as mpesa_router
from app.api.v1.plans import router as plans_router
from app.api.v1.provisioning import router as provisioning_router
from app.api.v1.reports import router as reports_router
from app.api.v1.subscriptions import router as subscriptions_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(customers_router)
api_router.include_router(plans_router)
api_router.include_router(subscriptions_router)
api_router.include_router(billing_router)
api_router.include_router(invoices_router)
api_router.include_router(mpesa_router)
api_router.include_router(provisioning_router)
api_router.include_router(tickets_router)
api_router.include_router(reports_router)
api_router.include_router(dashboard_router)
