from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID

class LocationPointInput(BaseModel):
    lat: float
    lon: float
    accM: float
    altM: Optional[float] = None
    speedMps: Optional[float] = None
    heading: Optional[float] = None
    battery: Optional[int] = None
    network: Optional[str] = None
    source: str = "gps"
    sampledAt: datetime

class LocationBatchInput(BaseModel):
    tripId: UUID
    points: List[LocationPointInput] = Field(..., max_length=50)

class LocationBatchResponse(BaseModel):
    accepted: int
    rejected: int
    nextSyncHintSec: int
    rejectReasons: List[str] = []

class LastFixResponse(BaseModel):
    lat: float
    lon: float
    accM: float
    sampledAt: datetime
    battery: Optional[int] = None
