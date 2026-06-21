"""Change usage_records bytes columns from INTEGER to BIGINT

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("usage_records", "download_bytes", type_=sa.BigInteger(), postgresql_using="download_bytes::bigint")
    op.alter_column("usage_records", "upload_bytes", type_=sa.BigInteger(), postgresql_using="upload_bytes::bigint")
    op.alter_column("usage_records", "total_bytes", type_=sa.BigInteger(), postgresql_using="total_bytes::bigint")


def downgrade() -> None:
    op.alter_column("usage_records", "download_bytes", type_=sa.Integer(), postgresql_using="download_bytes::integer")
    op.alter_column("usage_records", "upload_bytes", type_=sa.Integer(), postgresql_using="upload_bytes::integer")
    op.alter_column("usage_records", "total_bytes", type_=sa.Integer(), postgresql_using="total_bytes::integer")
