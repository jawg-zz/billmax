from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanUpdate
from app.services.base import BaseService


class PlanService(BaseService[Plan, PlanCreate, PlanUpdate]):
    def __init__(self, db: AsyncSession):
        super().__init__(Plan, db)
