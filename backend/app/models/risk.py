import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class TripRisk(Base):
    __tablename__ = "trip_risks"
    __table_args__ = {"schema": "trips"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.trips.id"), nullable=False, unique=True, index=True)
    current_score = Column(Integer, nullable=False, default=0)
    last_calculated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    trip = relationship("Trip", back_populates="risk_profile")


class RiskEvent(Base):
    __tablename__ = "risk_events"
    __table_args__ = {"schema": "trips"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.trips.id"), nullable=False, index=True)
    factor_type = Column(String, nullable=False) # e.g., 'MISSED_CHECKIN', 'BATTERY_CRITICAL'
    points = Column(Integer, nullable=False)
    confidence = Column(Integer, nullable=False, default=100) # Confidence score 0-100
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    details = Column(JSONB, nullable=True) # To store the raw vector
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime(timezone=True))

    trip = relationship("Trip", back_populates="risk_events")
