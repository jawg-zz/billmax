import uuid
from typing import Any, Generic, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def create(self, data: CreateSchemaType, **extra_fields: Any) -> ModelType:
        obj = self.model(**data.model_dump(), **extra_fields)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get(self, id: uuid.UUID, organization_id: uuid.UUID) -> ModelType:
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == id,
                self.model.organization_id == organization_id,
            )
        )
        obj = result.scalar_one_or_none()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{self.model.__name__} not found",
            )
        return obj

    async def list(
        self, organization_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[ModelType]:
        result = await self.db.execute(
            select(self.model)
            .where(self.model.organization_id == organization_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update(
        self, id: uuid.UUID, data: UpdateSchemaType, organization_id: uuid.UUID
    ) -> ModelType:
        obj = await self.get(id, organization_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, id: uuid.UUID, organization_id: uuid.UUID) -> None:
        obj = await self.get(id, organization_id)
        await self.db.delete(obj)
        await self.db.commit()

    async def count(self, organization_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                self.model.organization_id == organization_id
            )
        )
        return result.scalar() or 0
