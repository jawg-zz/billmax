import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, AnyStaff, SupportStaff
from app.models.customer import Customer
from app.models.user import User
from app.schemas.ticket import (
    TicketCommentCreate,
    TicketCommentRead,
    TicketCreate,
    TicketRead,
    TicketUpdate,
)
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=list[TicketRead])
async def list_tickets(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    customer_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = TicketService(db)
    return await service.list(
        user.organization_id,
        status=status,
        priority=priority,
        customer_id=customer_id,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=TicketRead, status_code=201)
async def create_ticket(
    data: TicketCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(SupportStaff),
):
    service = TicketService(db)
    return await service.create(data, user.organization_id)


@router.get("/{ticket_id}", response_model=TicketRead)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = TicketService(db)
    ticket = await service.get(ticket_id, user.organization_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.put("/{ticket_id}", response_model=TicketRead)
async def update_ticket(
    ticket_id: uuid.UUID,
    data: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(SupportStaff),
):
    service = TicketService(db)
    ticket = await service.update(ticket_id, data, user.organization_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.get("/{ticket_id}/comments", response_model=list[TicketCommentRead])
async def list_comments(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AnyStaff),
):
    service = TicketService(db)
    ticket = await service.get(ticket_id, user.organization_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    is_admin = user.role == "admin"
    return await service.get_comments(ticket_id, organization_id=user.organization_id, include_internal=is_admin)


@router.post("/{ticket_id}/comments", response_model=TicketCommentRead, status_code=201)
async def add_comment(
    ticket_id: uuid.UUID,
    data: TicketCommentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(SupportStaff),
):
    service = TicketService(db)
    ticket = await service.get(ticket_id, user.organization_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return await service.add_comment(ticket_id, data, organization_id=user.organization_id, user_id=user.id)
