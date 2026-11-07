"""user activity

Revision ID: 70d6990af41f
Revises: e6a52374936d
Create Date: 2026-11-07 23:21:34.434951+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '70d6990af41f'
down_revision: str | None = 'e6a52374936d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('user_activity',
    sa.Column('day', sa.Date(), nullable=False),
    sa.Column('user_id', sa.BigInteger(), nullable=False),
    sa.Column('bot_events', sa.Integer(), server_default='0', nullable=False),
    sa.Column('app_events', sa.Integer(), server_default='0', nullable=False),
    sa.PrimaryKeyConstraint('day', 'user_id', name=op.f('pk_user_activity'))
    )
    op.create_index('ix_user_activity_user_id', 'user_activity', ['user_id'], unique=False)
    op.add_column('users', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_users_last_seen_at'), 'users', ['last_seen_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_last_seen_at'), table_name='users')
    op.drop_column('users', 'last_seen_at')
    op.drop_index('ix_user_activity_user_id', table_name='user_activity')
    op.drop_table('user_activity')
