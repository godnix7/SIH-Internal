import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Date, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database import Base
from app.models.auth import User  # Ensure User is imported for relationships if needed later

class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = {"schema": "trips"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False, index=True)
    destination = Column(String, nullable=False)
    destination_point = Column(Geometry('POINT', srid=4326))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    consent_tier = Column(String, nullable=False)
    status = Column(String, nullable=False, default='draft', index=True)
    checkin_interval_minutes = Column(Integer)
    zone_pack_version = Column(Integer)
    monitoring_mode = Column(String, default='IDLE')
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    receipts = relationship("ConsentReceipt", back_populates="trip")


class ConsentReceipt(Base):
    __tablename__ = "consent_receipts"
    __table_args__ = {"schema": "trips"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False, index=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.trips.id"))
    consent_tier = Column(String, nullable=False)
    previous_tier = Column(String)
    purpose_text = Column(Text, nullable=False)
    granted_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    withdrawn_at = Column(DateTime(timezone=True))
    receipt_hash = Column(String, nullable=False)

    trip = relationship("Trip", back_populates="receipts")
