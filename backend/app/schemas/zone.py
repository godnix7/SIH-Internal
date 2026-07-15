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
    schedule: Optional[Dict[str, Any]]
    description: str
    status: str
    version: int
    geometry_geojson: Optional[Dict[str, Any]] = None # Transformed to GeoJSON for client
