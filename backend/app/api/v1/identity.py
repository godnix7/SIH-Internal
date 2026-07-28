import uuid
import json
import base64
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.core.middleware import get_current_user
from app.core.security import encrypt_pii, decrypt_pii
from app.models.auth import User
from app.models.identity import Identity, MedicalCard, EmergencyContact
from app.schemas.identity import KycVerificationRequest, KycVerificationResponse, IdentityScanRequest, IdentityScanResponse, EmergencyContactSchema

router = APIRouter()

@router.post("/verify", response_model=KycVerificationResponse, status_code=201)
async def verify_identity(
    req: KycVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit KYC verification. 
    In MVP, this mocks the DigiLocker/OCR validation and immediately approves.
    """
    # Check if already verified
    result = await db.execute(select(Identity).where(Identity.user_id == current_user.user_id))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Identity already verified")
        
    # Dynamic data extraction based on payload
    name = None
    dob = None
    confidence = "low"
    
    if req.type == 'passport':
        if not req.mrzData:
            raise HTTPException(status_code=400, detail="mrzData required for passport verification")
        try:
            mrz_parsed = json.loads(req.mrzData)
            name = mrz_parsed.get("name")
            dob = mrz_parsed.get("dob")
        except:
            name = "Unknown Passport Holder"
            dob = "1900-01-01"
        confidence = "medium"
    elif req.type == 'aadhaar':
        if not req.digilockerToken:
            raise HTTPException(status_code=400, detail="digilockerToken required for aadhaar verification")
        try:
            # Expected a JSON payload disguised as a token or a JWT body for MVP
            import base64
            # Very basic extraction logic for MVP
            padded = req.digilockerToken + "=" * ((4 - len(req.digilockerToken) % 4) % 4)
            token_decoded = json.loads(base64.b64decode(padded).decode('utf-8'))
            name = token_decoded.get("name")
            dob = token_decoded.get("dob")
        except:
            # Fallback if invalid base64 json
            try:
                payload = json.loads(req.digilockerToken)
                name = payload.get("name")
                dob = payload.get("dob")
            except:
                name = "Unknown Aadhaar Holder"
                dob = "1900-01-01"
        confidence = "high"
    else:
        raise HTTPException(status_code=400, detail="Unsupported identity type")
        
    if not name or not dob:
        raise HTTPException(status_code=400, detail="Could not extract name or dob from payload")

    expires_at = datetime.now(timezone.utc) + timedelta(days=365) # Valid for 1 year
    
    credential_data = {
        "iss": "yatrishield",
        "sub": str(current_user.user_id),
        "type": "digital_id",
        "name": name,
        "verified": True,
        "exp": int(expires_at.timestamp())
    }
    
    # Store encrypted
    identity = Identity(
        user_id=current_user.user_id,
        id_type=req.type,
        name_enc=encrypt_pii(name),
        name_verified=True,
        dob_enc=encrypt_pii(dob),
        credential_data=credential_data,
        confidence=confidence,
        expires_at=expires_at
    )
    
    db.add(identity)
    await db.commit()
    await db.refresh(identity)
    
    # Generate mock QR data (base64 of JSON for MVP)
    qr_data = base64.b64encode(json.dumps(credential_data).encode()).decode()
    
    return KycVerificationResponse(
        identityId=identity.id,
        confidence=identity.confidence,
        credentialQR=qr_data,
        expiresAt=identity.expires_at
    )

@router.post("/scan", response_model=IdentityScanResponse)
async def scan_identity(
    req: IdentityScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Hospital API to scan a QR token and retrieve decrypted Medical Card and Identity data.
    """
    if current_user.role not in ["hospital", "sys_admin"]:
        raise HTTPException(status_code=403, detail="Only hospital staff can scan IDs")

    # In a real app we'd decode and verify the JWT signature here.
    # For this MVP, since we passed a base64 encoded json string:
    try:
        padded = req.qrToken + "=" * ((4 - len(req.qrToken) % 4) % 4)
        token_decoded = json.loads(base64.b64decode(padded).decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid QR token format")

    user_id_str = token_decoded.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=400, detail="Token missing subject identifier")

    try:
        target_user_id = uuid.UUID(user_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid subject identifier")

    # Fetch Identity
    result = await db.execute(select(Identity).where(Identity.user_id == target_user_id))
    identity = result.scalars().first()
    
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")
        
    name = decrypt_pii(identity.name_enc)
    dob = decrypt_pii(identity.dob_enc) if identity.dob_enc else None

    # Fetch Medical Card
    mc_result = await db.execute(select(MedicalCard).where(MedicalCard.user_id == target_user_id))
    medical_card = mc_result.scalars().first()
    
    blood_group = None
    allergies = []
    medications = []
    conditions = []
    
    if medical_card:
        blood_group = medical_card.blood_group
        allergies = json.loads(decrypt_pii(medical_card.allergies_enc)) if medical_card.allergies_enc else []
        medications = json.loads(decrypt_pii(medical_card.medications_enc)) if medical_card.medications_enc else []
        conditions = json.loads(decrypt_pii(medical_card.conditions_enc)) if medical_card.conditions_enc else []
        
    # Fetch Emergency Contacts
    ec_result = await db.execute(select(EmergencyContact).where(EmergencyContact.user_id == target_user_id))
    emergency_contacts = ec_result.scalars().all()
    
    ec_out = []
    for ec in emergency_contacts:
        ec_out.append(EmergencyContactSchema(
            id=ec.id,
            name=decrypt_pii(ec.name_enc),
            phone=decrypt_pii(ec.phone_enc),
            relationship=ec.relationship,
            notifyTrip=ec.notify_trip,
            notifyDailyOk=ec.notify_daily_ok
        ))

    return IdentityScanResponse(
        userId=target_user_id,
        name=name,
        dob=dob,
        nationality=identity.nationality,
        verified=identity.name_verified,
        bloodGroup=blood_group,
        allergies=allergies,
        medications=medications,
        conditions=conditions,
        emergencyContacts=ec_out,
        medicalDataSelfDeclared=True # Always flagged per spec
    )
