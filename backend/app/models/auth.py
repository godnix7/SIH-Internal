import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, CheckConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('tourist','operator','dispatcher','supervisor','hospital','tourism_admin','sys_admin','auditor')"),
        CheckConstraint("status IN ('active','suspended','deleted')"),
        {"schema": "auth"}
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    phone_hash: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    phone_enc: Mapped[bytes] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(String, default="tourist", index=True, nullable=False)
    language: Mapped[str] = mapped_column(String, default="en", nullable=False)
    status: Mapped[str] = mapped_column(String, default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)


class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (
        CheckConstraint("platform IN ('android','ios','web')"),
        {"schema": "auth"}
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    device_fingerprint: Mapped[str] = mapped_column(String, nullable=False)
    platform: Mapped[str] = mapped_column(String, nullable=False)
    sos_token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    push_token: Mapped[str] = mapped_column(String, nullable=True)
    attestation: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    device_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class OTPAttempt(Base):
    __tablename__ = "otp_attempts"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    phone_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    locked_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
