import abc
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class DisasterEvent(BaseModel):
    id: str
    source: str
    sourceEventId: str
    eventType: str
    severity: str
    title: str
    description: str
    latitude: float
    longitude: float
    issuedAt: datetime
    updatedAt: datetime
    expiresAt: datetime
    sourceUrl: Optional[str] = None
    sourceConfidence: float = 1.0
    corroborationScore: float = 0.0
    overallConfidence: float = 1.0
    lastVerifiedAt: datetime
    geometrySource: str = 'derived_approximation'

class DisasterSourceAdapter(abc.ABC):
    """
    Base class for all disaster intelligence sources.
    Must normalize source-specific data into the unified DisasterEvent schema.
    """
    
    @property
    @abc.abstractmethod
    def source_name(self) -> str:
        pass

    @abc.abstractmethod
    async def fetch_events(self) -> List[DisasterEvent]:
        """Fetch active events and normalize them into DisasterEvent objects."""
        pass
