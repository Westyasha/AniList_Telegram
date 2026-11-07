"""initial schema

Revision ID: c3c2e8967137
Revises:
Create Date: 2026-11-07 21:49:48.397007+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3c2e8967137"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "fsm_states",
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("state", sa.String(length=255), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_fsm_states")),
    )
    op.create_table(
        "image_cache",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("digest", sa.String(length=32), nullable=False),
        sa.Column("file_id", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "kind", name=op.f("pk_image_cache")),
    )
    op.create_table(
        "kv",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_kv")),
    )
    op.create_table(
        "navigation",
        sa.Column("target", sa.String(length=160), nullable=False),
        sa.Column("stack", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("target", name=op.f("pk_navigation")),
    )
    op.create_index("ix_navigation_updated_at", "navigation", ["updated_at"], unique=False)
    op.create_table(
        "oauth_pending",
        sa.Column("nonce", sa.String(length=64), nullable=False),
        sa.Column("csrf", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=True),
        sa.Column("message_id", sa.BigInteger(), nullable=True),
        sa.Column("token_enc", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("viewer", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("nonce", name=op.f("pk_oauth_pending")),
    )
    op.create_index(op.f("ix_oauth_pending_expires_at"), "oauth_pending", ["expires_at"], unique=False)
    op.create_table(
        "oauth_states",
        sa.Column("nonce", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=True),
        sa.Column("message_id", sa.BigInteger(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("nonce", name=op.f("pk_oauth_states")),
    )
    op.create_index(op.f("ix_oauth_states_expires_at"), "oauth_states", ["expires_at"], unique=False)
    op.create_table(
        "sent_notifications",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("episode", sa.Integer(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "kind", "media_id", "episode", name=op.f("pk_sent_notifications")),
    )
    op.create_index("ix_sent_notifications_sent_at", "sent_notifications", ["sent_at"], unique=False)
    op.create_table(
        "short_texts",
        sa.Column("digest", sa.String(length=16), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("digest", name=op.f("pk_short_texts")),
    )
    op.create_table(
        "users",
        sa.Column("user_id", sa.BigInteger(), autoincrement=False, nullable=False),
        sa.Column("lang", sa.String(length=8), server_default="ru", nullable=False),
        sa.Column("anilist_id", sa.Integer(), nullable=True),
        sa.Column("anilist_name", sa.String(length=64), nullable=True),
        sa.Column("token_enc", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score_format", sa.String(length=24), server_default="POINT_10", nullable=False),
        sa.Column("title_language", sa.String(length=24), server_default="ENGLISH", nullable=False),
        sa.Column("notifications", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("keyboard_layout", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("last_notification", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("blocked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_anilist_id"), "users", ["anilist_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_anilist_id"), table_name="users")
    op.drop_table("users")
    op.drop_table("short_texts")
    op.drop_index("ix_sent_notifications_sent_at", table_name="sent_notifications")
    op.drop_table("sent_notifications")
    op.drop_index(op.f("ix_oauth_states_expires_at"), table_name="oauth_states")
    op.drop_table("oauth_states")
    op.drop_index(op.f("ix_oauth_pending_expires_at"), table_name="oauth_pending")
    op.drop_table("oauth_pending")
    op.drop_index("ix_navigation_updated_at", table_name="navigation")
    op.drop_table("navigation")
    op.drop_table("kv")
    op.drop_table("image_cache")
    op.drop_table("fsm_states")
