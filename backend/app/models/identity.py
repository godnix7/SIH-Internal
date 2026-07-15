import uuid
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, SmallInteger
from sqlalchemy.dialects.postgresql import UUID, BYTEA, JSONB
from sqlalchemy.sql import func
from app.database import Base

class Identity(Base):
    __tablename__ = "identities"
    __table_args__ = {"schema": "identity"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('auth.users.id'), nullable=False, unique=True)
    id_type = Column(String, nullable=False) # 'aadhaar', 'passport', 'provisional'
    name_enc = Column(BYTEA, nullable=False)
    name_verified = Column(Boolean, nullable=False, default=False)
    dob_enc = Column(BYTEA)
    nationality = Column(String)
    photo_url = Column(String)
    passport_number_enc = Column(BYTEA)
    credential_data = Column(JSONB, nullable=False)
    confidence = Column(String, nullable=False) # 'high', 'medium', 'low'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class MedicalCard(Base):
    __tablename__ = "medical_cards"
    __table_args__ = {"schema": "identity"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('auth.users.id'), nullable=False, unique=True)
    blood_group = Column(String)
    allergies_enc = Column(BYTEA)
    medications_enc = Column(BYTEA)
    conditions_enc = Column(BYTEA)
    gp_contact_enc = Column(BYTEA)
    insurer_enc = Column(BYTEA)
    all_self_declared = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    __table_args__ = {"schema": "identity"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('auth.users.id'), nullable=False)
    name_enc = Column(BYTEA, nullable=False)
    phone_enc = Column(BYTEA, nullable=False)
    relationship = Column(String, nullable=False)
    notify_trip = Column(Boolean, nullable=False, default=True)
    notify_sos = Column(Boolean, nullable=False, default=True)
    notify_daily_ok = Column(Boolean, nullable=False, default=False)
    ordinal = Column(SmallInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
