import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = {"schema": "incident"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sos_alert_id = Column(UUID(as_uuid=True), ForeignKey('sos.sos_alerts.id'), index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('auth.users.id'), index=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trips.id'), index=True)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, nullable=False, default='created', index=True)
    jurisdiction = Column(UUID(as_uuid=True), index=True)
    assigned_to = Column(UUID(as_uuid=True), index=True)
    location = Column(Geometry(geometry_type='POINT', srid=4326))
    disposition_code = Column(String)
    summary = Column(String)
    merged_into = Column(UUID(as_uuid=True), ForeignKey('incident.incidents.id'))
    chain_head = Column(String)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))


class IncidentEvent(Base):
    __tablename__ = "incident_events"
    __table_args__ = {"schema": "incident"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey('incident.incidents.id'), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    actor_id = Column(UUID(as_uuid=True))
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
