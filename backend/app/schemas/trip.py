from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class TripCreate(BaseModel):
    destination: str
    destination_point: Optional[str] = None  # WKT or similar representation if needed
    start_date: date
    end_date: date
    consent_tier: str
    party_size: Optional[int] = 1

class TripTierUpdate(BaseModel):
    consent_tier: str

class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    destination: str
    start_date: date
    end_date: date
    consent_tier: str
    status: str
    monitoring_mode: str
    created_at: datetime
    updated_at: datetime
