import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from app.database import Base

class LocationPoint(Base):
    __tablename__ = "location_points"
    __table_args__ = {"schema": "location"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sampled_at = Column(DateTime(timezone=True), primary_key=True)  # Needed for partitioning by sampled_at
    trip_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    point = Column(Geometry('POINT', srid=4326), nullable=False)
    accuracy_m = Column(Float, nullable=False)
    altitude_m = Column(Float)
    speed_mps = Column(Float)
    heading = Column(Float)
    battery_pct = Column(Integer)
    network_type = Column(String)
    source = Column(String, nullable=False, default='gps')
    received_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    batch_id = Column(UUID(as_uuid=True), nullable=False)
