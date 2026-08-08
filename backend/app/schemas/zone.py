from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class ZoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    zone_class: str
    buffer_m: int
    schedule: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    status: str
    version: int
    geometry_geojson: Optional[Dict[str, Any]] = None # Transformed to GeoJSON for client
    safety_score: int = 100
    crime_data: Optional[List[Dict[str, Any]]] = None
    risk_factors: Optional[List[str]] = None
    total_incidents: int = 0
    expires_at: Optional[datetime] = None
    geometry_source: Optional[str] = "official"
    confidence: Optional[float] = 1.0
    sources: Optional[List[str]] = None

class ZoneCreateRequest(BaseModel):
    name: str
    zone_class: str
    buffer_m: float = 100
    description: Optional[str] = None
    geometry_geojson: dict
    safety_score: Optional[int] = None
    crime_data: Optional[List[Dict[str, Any]]] = None
    risk_factors: Optional[List[str]] = None

class ZoneUpdateRequest(BaseModel):
    name: Optional[str] = None
    zone_class: Optional[str] = None
    buffer_m: Optional[float] = None
    description: Optional[str] = None
    safety_score: Optional[int] = None
    crime_data: Optional[List[Dict[str, Any]]] = None
    risk_factors: Optional[List[str]] = None
    status: Optional[str] = None
