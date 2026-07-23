from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from uuid import UUID

class KycVerificationRequest(BaseModel):
    type: str # 'aadhaar', 'passport'
    digilockerToken: Optional[str] = None
    mrzData: Optional[str] = None
    photoBase64: Optional[str] = None

class KycVerificationResponse(BaseModel):
    identityId: UUID
    confidence: str
    credentialQR: str
    expiresAt: datetime

class MedicalCardSchema(BaseModel):
    bloodGroup: Optional[str] = None
    allergies: List[str] = []
    medications: List[str] = []
    conditions: List[str] = []
    gpContact: Optional[str] = None
    insurer: Optional[str] = None
    allSelfDeclared: bool = True

class MedicalCardUpdateRequest(BaseModel):
    bloodGroup: Optional[str] = None
    allergies: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    gpContact: Optional[str] = None
    insurer: Optional[str] = None

class EmergencyContactSchema(BaseModel):
    id: UUID
    name: str
    phone: str
    relationship: str
    notifyTrip: bool
    notifyDailyOk: bool

class CreateEmergencyContactRequest(BaseModel):
    name: str
    phone: str
    relationship: str
    notifyTrip: bool = True
    notifyDailyOk: bool = False

class IdentitySchema(BaseModel):
    idType: str
    nameVerified: bool
    confidence: str
    expiresAt: datetime
    # Name and DOB are not returned in basic profile to avoid PII over-sharing

class UserProfileResponse(BaseModel):
    id: UUID
    phone: str # Decrypted for the owner to see
    role: str
    status: str
    identity: Optional[IdentitySchema] = None

class IdentityScanRequest(BaseModel):
    qrToken: str

class IdentityScanResponse(BaseModel):
    userId: UUID
    name: str
    dob: Optional[str] = None
    nationality: Optional[str] = None
    verified: bool
    bloodGroup: Optional[str] = None
    allergies: List[str] = []
    medications: List[str] = []
    conditions: List[str] = []
    emergencyContacts: List[EmergencyContactSchema] = []
    medicalDataSelfDeclared: bool = True
