from fastapi import APIRouter

from app.auth import auth_backend, fastapi_users
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# Additional user endpoints not provided by fastapi-users
from fastapi import Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import AdminOnly
from app.models.user import User as UserModel

@router.get("/users", response_model=list[UserRead])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(AdminOnly),
):
    result = await db.execute(
        select(UserModel)
        .order_by(UserModel.created_at.desc())
        .offset(skip).limit(limit)
    )
    return list(result.scalars().all())
