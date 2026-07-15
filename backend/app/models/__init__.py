from app.database import Base
from app.models.auth import User, Device, Session, OTPAttempt
from app.models.trip import Trip, ConsentReceipt
from app.models.zone import Zone
from app.models.location import LocationPoint
from app.models.identity import Identity, MedicalCard, EmergencyContact
from app.models.sos import SOSAlert
from app.models.incident import Incident, IncidentEvent
