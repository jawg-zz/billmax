import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.base import BaseService


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate]):
    def __init__(self, db: AsyncSession):
        super().__init__(Customer, db)

    async def list_by_status(
        self,
        organization_id: uuid.UUID,
        status: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Customer]:
        result = await self.db.execute(
            select(self.model)
            .where(
                self.model.organization_id == organization_id,
                self.model.status == status,
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
