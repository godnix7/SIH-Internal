from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from uuid import UUID

class LocationPointSchema(BaseModel):
    lat: float
    lon: float
    accM: float
    ts: datetime

class SOSCreateRequest(BaseModel):
    clientSosId: UUID
    type: str = 'general'
    location: Optional[LocationPointSchema] = None
    battery: Optional[int] = None
    network: Optional[str] = None
    note: Optional[str] = None
    covert: bool = False
    tripId: Optional[UUID] = None

class SOSResponse(BaseModel):
    sosId: UUID
    incidentId: UUID
    status: str
    ackSlaSec: int

class SOSAcknowledgeRequest(BaseModel):
    unitId: UUID
    etaMinutes: int

class SOSCancelRequest(BaseModel):
    reason: str
    notes: Optional[str] = None

class IncidentEventSchema(BaseModel):
    id: UUID
    eventType: str
    createdAt: datetime
    details: Optional[Dict[str, Any]] = None

class IncidentResponse(BaseModel):
    id: UUID
    sosAlertId: UUID
    status: str
    severity: str
    type: str
    createdAt: datetime
    updatedAt: datetime
    events: List[IncidentEventSchema] = []
