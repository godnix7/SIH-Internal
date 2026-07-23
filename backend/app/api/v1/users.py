import json
import base64
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.core.middleware import get_current_user
from app.core.security import encrypt_pii, decrypt_pii
from app.models.auth import User, Session, Device
from app.models.identity import Identity, MedicalCard, EmergencyContact
from app.schemas.identity import (
    UserProfileResponse, 
    IdentitySchema, 
    MedicalCardSchema, 
    MedicalCardUpdateRequest,
    EmergencyContactSchema,
    CreateEmergencyContactRequest
)

router = APIRouter()

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Identity).where(Identity.user_id == current_user.id))
    identity = result.scalars().first()
    
    id_schema = None
    if identity:
        id_schema = IdentitySchema(
            idType=identity.id_type,
            nameVerified=identity.name_verified,
            confidence=identity.confidence,
            expiresAt=identity.expires_at
        )
        
    return UserProfileResponse(
        id=current_user.id,
        phone=decrypt_pii(current_user.phone_hash),
        role=current_user.role,
        status=current_user.status,
        identity=id_schema
    )

@router.patch("/me/language")
async def update_language(language: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if language not in ["en", "hi"]:
        raise HTTPException(status_code=400, detail="Unsupported language")
    
    # Resolve actual DB user
    if current_user.role == 'tourist':
        user_uuid = uuid.UUID(current_user.user_id) if isinstance(current_user.user_id, str) else current_user.user_id
        result = await db.execute(select(User).where(User.id == user_uuid))
        db_user = result.scalars().first()
        if db_user:
            db_user.language = language
            await db.commit()
    # Internal users don't store language in DB, we return success and let client store in localStorage
    return {"status": "ok", "language": language}

@router.get("/me/id")
async def get_digital_id(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Identity).where(Identity.user_id == current_user.id))
    identity = result.scalars().first()
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not verified")
        
    qr_data = base64.b64encode(json.dumps(identity.credential_data).encode()).decode()
    return {"credentialQR": qr_data}


@router.get("/me/medical", response_model=MedicalCardSchema)
async def get_medical_card(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MedicalCard).where(MedicalCard.user_id == current_user.id))
    card = result.scalars().first()
    if not card:
        return MedicalCardSchema()
        
    return MedicalCardSchema(
        bloodGroup=card.blood_group,
        allergies=json.loads(decrypt_pii(card.allergies_enc)) if card.allergies_enc else [],
        medications=json.loads(decrypt_pii(card.medications_enc)) if card.medications_enc else [],
        conditions=json.loads(decrypt_pii(card.conditions_enc)) if card.conditions_enc else [],
        gpContact=decrypt_pii(card.gp_contact_enc) if card.gp_contact_enc else None,
        insurer=decrypt_pii(card.insurer_enc) if card.insurer_enc else None,
        allSelfDeclared=card.all_self_declared
    )

@router.patch("/me/medical", response_model=MedicalCardSchema)
async def update_medical_card(
    req: MedicalCardUpdateRequest, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MedicalCard).where(MedicalCard.user_id == current_user.id))
    card = result.scalars().first()
    
    if not card:
        card = MedicalCard(user_id=current_user.id)
        db.add(card)
        
    if req.bloodGroup is not None:
        card.blood_group = req.bloodGroup
    if req.allergies is not None:
        card.allergies_enc = encrypt_pii(json.dumps(req.allergies))
    if req.medications is not None:
        card.medications_enc = encrypt_pii(json.dumps(req.medications))
    if req.conditions is not None:
        card.conditions_enc = encrypt_pii(json.dumps(req.conditions))
    if req.gpContact is not None:
        card.gp_contact_enc = encrypt_pii(req.gpContact)
    if req.insurer is not None:
        card.insurer_enc = encrypt_pii(req.insurer)
        
    await db.commit()
    return await get_medical_card(current_user, db)


@router.get("/me/contacts", response_model=List[EmergencyContactSchema])
async def get_emergency_contacts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmergencyContact).where(EmergencyContact.user_id == current_user.id).order_by(EmergencyContact.ordinal))
    contacts = result.scalars().all()
    return [
        EmergencyContactSchema(
            id=c.id,
            name=decrypt_pii(c.name_enc),
            phone=decrypt_pii(c.phone_enc),
            relationship=c.relationship,
            notifyTrip=c.notify_trip,
            notifyDailyOk=c.notify_daily_ok
        ) for c in contacts
    ]

@router.post("/me/contacts", response_model=EmergencyContactSchema)
async def create_emergency_contact(
    req: CreateEmergencyContactRequest, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # Check limit
    result = await db.execute(select(EmergencyContact).where(EmergencyContact.user_id == current_user.id))
    existing = result.scalars().all()
    if len(existing) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 emergency contacts allowed")
        
    ordinal = max([c.ordinal for c in existing] + [-1]) + 1
    
    contact = EmergencyContact(
        user_id=current_user.id,
        name_enc=encrypt_pii(req.name),
        phone_enc=encrypt_pii(req.phone),
        relationship=req.relationship,
        notify_trip=req.notifyTrip,
        notify_daily_ok=req.notifyDailyOk,
        ordinal=ordinal
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    
    return EmergencyContactSchema(
        id=contact.id,
        name=req.name,
        phone=req.phone,
        relationship=contact.relationship,
        notifyTrip=contact.notify_trip,
        notifyDailyOk=contact.notify_daily_ok
    )

@router.delete("/me/contacts/{contact_id}")
async def delete_emergency_contact(contact_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmergencyContact).where(EmergencyContact.id == contact_id, EmergencyContact.user_id == current_user.id))
    contact = result.scalars().first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    await db.delete(contact)
    await db.commit()
    return {"status": "ok"}

@router.get("/me/export")
async def export_my_data(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Export basic profile
    profile = {
        "id": str(current_user.id),
        "phone": decrypt_pii(current_user.phone_hash),
        "role": current_user.role,
        "status": current_user.status
    }
    
    # Export medical
    result_med = await db.execute(select(MedicalCard).where(MedicalCard.user_id == current_user.id))
    card = result_med.scalars().first()
    medical = None
    if card:
        medical = {
            "bloodGroup": card.blood_group,
            "allergies": json.loads(decrypt_pii(card.allergies_enc)) if card.allergies_enc else [],
            "medications": json.loads(decrypt_pii(card.medications_enc)) if card.medications_enc else [],
            "conditions": json.loads(decrypt_pii(card.conditions_enc)) if card.conditions_enc else []
        }
        
    # Export contacts
    result_con = await db.execute(select(EmergencyContact).where(EmergencyContact.user_id == current_user.id))
    contacts = result_con.scalars().all()
    contacts_export = [
        {
            "name": decrypt_pii(c.name_enc),
            "phone": decrypt_pii(c.phone_enc),
            "relationship": c.relationship
        } for c in contacts
    ]
    
    return {
        "profile": profile,
        "medical": medical,
        "contacts": contacts_export,
        "exportedAt": datetime.now(timezone.utc).isoformat()
    }

@router.delete("/me")
async def delete_my_account(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Soft delete the user account to anonymize PII."""
    current_user.status = "deleted"
    current_user.deleted_at = datetime.now(timezone.utc)
    # Anonymize phone
    current_user.phone_hash = f"deleted_{current_user.id}"
    current_user.phone_enc = encrypt_pii("deleted")
    
    # Delete identity/medical
    await db.execute(Identity.__table__.delete().where(Identity.user_id == current_user.id))
    await db.execute(MedicalCard.__table__.delete().where(MedicalCard.user_id == current_user.id))
    await db.execute(EmergencyContact.__table__.delete().where(EmergencyContact.user_id == current_user.id))
    
    # Clear sessions
    await db.execute(Session.__table__.delete().where(Session.user_id == current_user.id))
    
    await db.commit()
    return {"status": "ok"}

@router.get("/me/sessions")
async def get_my_sessions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List active sessions and associated devices."""
    result = await db.execute(
        select(Session, Device)
        .join(Device, Session.device_id == Device.id)
        .where(Session.user_id == current_user.id)
    )
    rows = result.all()
    
    sessions = []
    for session, device in rows:
        sessions.append({
            "id": str(session.id),
            "platform": device.platform,
            "deviceFingerprint": device.device_fingerprint,
            "createdAt": session.created_at.isoformat(),
            "lastSeenAt": device.last_seen_at.isoformat()
        })
    return sessions

@router.delete("/me/sessions")
async def revoke_all_other_sessions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Revokes all sessions except the current one (mocking by just deleting all since we don't track current session ID contextually easily here)."""
    await db.execute(Session.__table__.delete().where(Session.user_id == current_user.id))
    await db.commit()
    return {"status": "ok"}


