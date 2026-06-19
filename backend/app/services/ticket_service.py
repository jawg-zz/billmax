import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket, TicketComment


class TicketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, data, organization_id: uuid.UUID
    ) -> Ticket:
        ticket = Ticket(
            organization_id=organization_id,
            customer_id=data.customer_id,
            subject=data.subject,
            description=data.description,
            priority=data.priority,
            status="open",
        )
        self.db.add(ticket)
        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

    async def get(
        self, ticket_id: uuid.UUID, organization_id: uuid.UUID
    ) -> Ticket | None:
        result = await self.db.execute(
            select(Ticket).where(
                Ticket.id == ticket_id,
                Ticket.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        organization_id: uuid.UUID,
        status: str | None = None,
        priority: str | None = None,
        customer_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Ticket]:
        query = select(Ticket).where(
            Ticket.organization_id == organization_id
        )
        if status:
            query = query.where(Ticket.status == status)
        if priority:
            query = query.where(Ticket.priority == priority)
        if customer_id:
            query = query.where(Ticket.customer_id == customer_id)
        query = query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(
        self, ticket_id: uuid.UUID, data, organization_id: uuid.UUID
    ) -> Ticket | None:
        ticket = await self.get(ticket_id, organization_id)
        if not ticket:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(ticket, field, value)
        if data.status == "resolved":
            ticket.resolved_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

    async def add_comment(
        self, ticket_id: uuid.UUID, data, user_id: uuid.UUID | None = None
    ) -> TicketComment | None:
        result = await self.db.execute(
            select(Ticket).where(Ticket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        if not ticket:
            return None
        comment = TicketComment(
            ticket_id=ticket_id,
            user_id=user_id,
            comment=data.comment,
            is_internal=data.is_internal,
        )
        self.db.add(comment)
        if ticket.status == "resolved":
            ticket.status = "in_progress"
        await self.db.commit()
        await self.db.refresh(comment)
        return comment

    async def get_comments(
        self, ticket_id: uuid.UUID, include_internal: bool = False
    ) -> "list[TicketComment]":
        query = select(TicketComment).where(
            TicketComment.ticket_id == ticket_id
        )
        if not include_internal:
            query = query.where(TicketComment.is_internal == False)
        query = query.order_by(TicketComment.created_at.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_status(
        self, organization_id: uuid.UUID, status: str
    ) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Ticket.organization_id == organization_id,
                Ticket.status == status,
            )
        )
        return result.scalar() or 0
