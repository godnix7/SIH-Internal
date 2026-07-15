import uuid
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Float, SmallInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.database import Base

class SOSAlert(Base):
    __tablename__ = "sos_alerts"
    __table_args__ = {"schema": "sos"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_sos_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('auth.users.id'), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trips.id'))
    incident_id = Column(UUID(as_uuid=True)) # Can't FK to incident schema initially to avoid circular dep, or just use UUID
    type = Column(String, nullable=False, default='general')
    location = Column(Geometry(geometry_type='POINT', srid=4326))
    accuracy_m = Column(Float)
    location_ts = Column(DateTime(timezone=True))
    battery_pct = Column(SmallInteger)
    network_type = Column(String)
    note = Column(String)
    source = Column(String, nullable=False, default='app')
    covert = Column(Boolean, nullable=False, default=False)
    status = Column(String, nullable=False, default='received')
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
