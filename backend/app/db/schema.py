from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Boolean, DateTime, Index, Integer, MetaData, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


def created_column() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserRow(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    lang: Mapped[str] = mapped_column(String(8), default="ru", server_default="ru")
    anilist_id: Mapped[int | None] = mapped_column(Integer, index=True)
    anilist_name: Mapped[str | None] = mapped_column(String(64))
    token_enc: Mapped[str | None] = mapped_column(Text)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    score_format: Mapped[str] = mapped_column(String(24), default="POINT_10", server_default="POINT_10")
    title_language: Mapped[str] = mapped_column(String(24), default="ENGLISH", server_default="ENGLISH")
    notifications: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    keyboard_layout: Mapped[list[Any] | None] = mapped_column(JSONB)
    last_notification: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    blocked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = created_column()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ImageCacheRow(Base):
    __tablename__ = "image_cache"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    kind: Mapped[str] = mapped_column(String(64), primary_key=True)
    digest: Mapped[str] = mapped_column(String(32))
    file_id: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = created_column()


class SentNotificationRow(Base):
    __tablename__ = "sent_notifications"
    __table_args__ = (Index("ix_sent_notifications_sent_at", "sent_at"),)

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    media_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    episode: Mapped[int] = mapped_column(Integer, primary_key=True, default=0)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NavigationRow(Base):
    __tablename__ = "navigation"
    __table_args__ = (Index("ix_navigation_updated_at", "updated_at"),)

    target: Mapped[str] = mapped_column(String(160), primary_key=True)
    stack: Mapped[list[str]] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OAuthStateRow(Base):
    __tablename__ = "oauth_states"

    nonce: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger)
    chat_id: Mapped[int | None] = mapped_column(BigInteger)
    message_id: Mapped[int | None] = mapped_column(BigInteger)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class OAuthPendingRow(Base):
    __tablename__ = "oauth_pending"

    nonce: Mapped[str] = mapped_column(String(64), primary_key=True)
    csrf: Mapped[str] = mapped_column(String(64))
    user_id: Mapped[int] = mapped_column(BigInteger)
    chat_id: Mapped[int | None] = mapped_column(BigInteger)
    message_id: Mapped[int | None] = mapped_column(BigInteger)
    token_enc: Mapped[str] = mapped_column(Text)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    viewer: Mapped[dict[str, Any]] = mapped_column(JSONB)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class ShortTextRow(Base):
    __tablename__ = "short_texts"

    digest: Mapped[str] = mapped_column(String(16), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = created_column()


class FsmRow(Base):
    __tablename__ = "fsm_states"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    state: Mapped[str | None] = mapped_column(String(255))
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")


class KeyValueRow(Base):
    __tablename__ = "kv"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
