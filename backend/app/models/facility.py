import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Enum, Integer

from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from sqlalchemy.sql import func
from app.database import Base

class Facility(Base):
    __tablename__ = "facilities"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, index=True) # e.g. 'police', 'hospital', 'embassy'
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    geometry = Column(Geometry('POINT', srid=4326), nullable=False)
    
    # Hospital specific fields
    capacity = Column(Integer, nullable=True)
    emergency_beds = Column(Integer, nullable=True)
    available_ambulances = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
