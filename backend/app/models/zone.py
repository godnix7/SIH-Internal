import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from app.database import Base

class Zone(Base):
    __tablename__ = "zones"
    __table_args__ = {"schema": "geofence"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    zone_class = Column("class", String, nullable=False)  # 'class' is a python keyword
    geometry = Column(Geometry('POLYGON', srid=4326), nullable=False)
    buffer_m = Column(Integer, nullable=False, default=100)
    schedule = Column(JSONB)
    description = Column(Text, nullable=False)
    status = Column(String, nullable=False, default='draft', index=True)
    version = Column(Integer, nullable=False, default=1)
    approved_by = Column(UUID(as_uuid=True))
    approved_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
