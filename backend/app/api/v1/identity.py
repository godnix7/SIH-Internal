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
from app.models.identity import Identity
from app.schemas.identity import KycVerificationRequest, KycVerificationResponse

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
    result = await db.execute(select(Identity).where(Identity.user_id == current_user.id))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Identity already verified")
        
    # Mock data extraction based on type
    name = "Mocked User"
    dob = "1990-01-01"
    confidence = "high"
    
    if req.type == 'passport':
        confidence = "medium"

    expires_at = datetime.now(timezone.utc) + timedelta(days=365) # Valid for 1 year
    
    credential_data = {
        "iss": "yatrishield",
        "sub": str(current_user.id),
        "type": "digital_id",
        "name": name,
        "verified": True,
        "exp": int(expires_at.timestamp())
    }
    
    # Store encrypted
    identity = Identity(
        user_id=current_user.id,
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
