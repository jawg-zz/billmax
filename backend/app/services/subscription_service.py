from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from app.services.base import BaseService


class SubscriptionService(
    BaseService[Subscription, SubscriptionCreate, SubscriptionUpdate]
):
    def __init__(self, db: AsyncSession):
        super().__init__(Subscription, db)
