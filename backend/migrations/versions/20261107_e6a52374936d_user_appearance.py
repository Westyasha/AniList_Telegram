"""user appearance

Revision ID: e6a52374936d
Revises: c3c2e8967137
Create Date: 2026-11-07 22:51:26.454498+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e6a52374936d"
down_revision: str | None = "c3c2e8967137"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("appearance", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False)
    )


def downgrade() -> None:
    op.drop_column("users", "appearance")
