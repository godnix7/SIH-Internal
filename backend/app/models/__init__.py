from app.database import Base
from app.models.auth import User, Device, Session, InternalUser, InternalSession
from app.models.trip import Trip, ConsentReceipt
from app.models.zone import Zone
from app.models.location import LocationPoint
from app.models.identity import Identity, MedicalCard, EmergencyContact
from app.models.sos import SOSAlert
from app.models.incident import Incident, IncidentEvent
from app.models.facility import Facility
from app.models.risk import TripRisk, RiskEvent
from app.models.blockchain import EventChain, MerkleAnchor
from app.models.faq import FAQ

# Add all models to this list to ensure they are discovered by Alembic/SQLAlchemy
__all__ = [
    "User", "Device", "Session", "InternalUser", "InternalSession",
    "Identity", "MedicalCard", "EmergencyContact",
    "Zone",
    "LocationPoint",
    "Trip", "ConsentReceipt",
    "SOSAlert",
    "FAQ",
    "Incident", "IncidentEvent",
    "Facility",
    "TripRisk", "RiskEvent",
    "EventChain", "MerkleAnchor"
]
