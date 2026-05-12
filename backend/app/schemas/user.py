import uuid

from fastapi_users import schemas


class UserRead(schemas.BaseUser[uuid.UUID]):
    role: str
    phone: str | None = None
    organization_id: uuid.UUID | None = None


class UserCreate(schemas.BaseUserCreate):
    role: str = "support"
    phone: str | None = None
    organization_id: uuid.UUID | None = None


class UserUpdate(schemas.BaseUserUpdate):
    role: str | None = None
    phone: str | None = None
    organization_id: uuid.UUID | None = None
