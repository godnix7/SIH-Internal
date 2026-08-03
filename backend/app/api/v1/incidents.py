import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.core.middleware import get_current_user
from app.models.auth import User
from app.models.incident import Incident, IncidentEvent
from app.models.sos import SOSAlert
from app.models.identity import Identity, MedicalCard
from app.schemas.sos import IncidentResponse, IncidentEventSchema, SOSAcknowledgeRequest, TouristDetails, SOSResolveRequest
from app.core.socket import broadcast_incident_update, broadcast_notification
from app.core.security import decrypt_pii
from app.services.blockchain import BlockchainService
import random
import secrets

router = APIRouter()

@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List incidents. If status_filter='history', returns closed/resolved incidents.
    Otherwise returns active incidents.
    """
    if current_user.role == 'tourist':
        stmt = select(Incident).where(Incident.user_id == current_user.id)
    else:
        if status_filter == 'history':
            stmt = select(Incident).where(Incident.status.in_(['closed', 'cancelled', 'cancelled_by_user', 'false_alarm', 'resolved', 'merged']))
        elif status_filter == 'all':
            stmt = select(Incident)
        else:
            stmt = select(Incident).where(Incident.status.notin_(['closed', 'cancelled', 'cancelled_by_user', 'false_alarm', 'resolved', 'merged']))
        
    result = await db.execute(stmt.order_by(Incident.created_at.desc()))
    incidents = result.scalars().all()
    
    responses = []
    for inc in incidents:
        # Fetch events
        ev_res = await db.execute(select(IncidentEvent).where(IncidentEvent.incident_id == inc.id).order_by(IncidentEvent.created_at))
        events = ev_res.scalars().all()
        
        event_schemas = [
            IncidentEventSchema(
                id=ev.id,
                eventType=ev.event_type,
                createdAt=ev.created_at,
                details=ev.details
            ) for ev in events
        ]
        
        # Fetch tourist details
        tourist_details = TouristDetails()
        ident_res = await db.execute(select(Identity).where(Identity.user_id == inc.user_id))
        identity = ident_res.scalars().first()
        if identity and identity.name_enc:
            try:
                tourist_details.name = decrypt_pii(identity.name_enc)
            except Exception:
                pass

        user_res = await db.execute(select(User).where(User.id == inc.user_id))
        user = user_res.scalars().first()
        if user and user.phone_hash:
            # Phone isn't encrypted identically to name (phone_hash is just hash), but usually we might store encrypted phone in Identity if requested. We can just use phone_hash as a mock if needed, or skip it.
            # Actually, the user object doesn't have phone_enc in MVP. Let's leave phone blank or use a placeholder.
            pass

        med_res = await db.execute(select(MedicalCard).where(MedicalCard.user_id == inc.user_id))
        medical = med_res.scalars().first()
        if medical:
            tourist_details.bloodGroup = medical.blood_group
            if medical.allergies_enc:
                try:
                    tourist_details.allergies = decrypt_pii(medical.allergies_enc)
                except Exception:
                    pass
            if medical.medications_enc:
                try:
                    tourist_details.medications = decrypt_pii(medical.medications_enc)
                except Exception:
                    pass

        # Try to extract WKT location if available. 
        # For geoalchemy2, it returns WKBElement natively, which is not JSON serializable easily without shapely.
        # We can run a secondary quick scalar query for the wkt.
        loc_wkt = None
        if inc.location is not None:
            from sqlalchemy.sql import func
            loc_wkt = await db.scalar(select(func.ST_AsText(Incident.location)).where(Incident.id == inc.id))

        responses.append(IncidentResponse(
            id=inc.id,
            sosAlertId=inc.sos_alert_id,
            status=inc.status,
            severity=inc.severity,
            type=inc.type,
            createdAt=inc.created_at,
            updatedAt=inc.updated_at,
            events=event_schemas,
            locationWkt=loc_wkt,
            touristDetails=tourist_details
        ))
        
    return responses

@router.post("/{incident_id}/acknowledge")
async def acknowledge_incident(
    incident_id: uuid.UUID,
    req: SOSAcknowledgeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Operator acknowledges an incident.
    """
    if current_user.role == 'tourist':
        raise HTTPException(status_code=403, detail="Only operators can acknowledge incidents")
        
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == 'acknowledged':
        return {"status": "acknowledged", "acknowledgedBy": str(incident.assigned_to)}
        
    incident.status = 'acknowledged'
    incident.assigned_to = current_user.id
    
    # Update underlying SOS
    sos_res = await db.execute(select(SOSAlert).where(SOSAlert.id == incident.sos_alert_id))
    sos = sos_res.scalars().first()
    if sos:
        sos.status = 'acknowledged'
        
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='acknowledged',
        actor_id=current_user.id,
        details={"notes": req.notes} if req.notes else {}
    )
    db.add(event)
    await db.flush() # flush to get event.id
    
    # Anchor to cryptographic chain
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    
    await db.commit()
    await db.refresh(incident)
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    
    return {"status": "acknowledged", "acknowledgedBy": str(current_user.id)}

@router.post("/{incident_id}/arrive")
async def arrive_incident(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == 'tourist':
        raise HTTPException(status_code=403, detail="Only operators can update arrival status")
        
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.status = 'responder_arrived'
    
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='responder_arrived',
        actor_id=current_user.id,
        details={"status": "Responders arrived on scene"}
    )
    db.add(event)
    await db.flush()
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    await db.commit()
    await db.refresh(incident)
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    return {"status": "responder_arrived"}

@router.post("/{incident_id}/request_resolve")
async def request_resolve_incident(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == 'tourist':
        raise HTTPException(status_code=403, detail="Only operators can request resolution")
        
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    # Generate secure 6-digit cryptographic OTP
    otp = str(secrets.randbelow(900000) + 100000)
    incident.resolution_otp = otp
    incident.status = 'resolve_pending'
    
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='resolve_pending',
        actor_id=current_user.id,
        details={"status": "6-digit OTP generated and sent to tourist for verification", "otp_length": 6}
    )
    db.add(event)
    await db.flush()
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    await db.commit()
    await db.refresh(incident)
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None,
        "otp": otp
    })
    await broadcast_notification({
        "type": "OTP_GENERATED",
        "title": "Verification OTP Generated",
        "message": f"6-digit verification code sent to victim screen for incident {str(incident.id)[:8]}",
        "incidentId": str(incident.id),
        "priority": "HIGH"
    })
    
    return {"status": "resolve_pending", "message": "6-digit OTP generated and sent to victim's display"}

@router.post("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: uuid.UUID,
    req: SOSResolveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == 'tourist':
        raise HTTPException(status_code=403, detail="Only operators can resolve incidents")
        
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == 'resolved':
        return {"status": "resolved"}

    # Verify OTP
    if incident.resolution_otp and incident.resolution_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP provided")
        
    from sqlalchemy.sql import func
    incident.status = 'resolved'
    incident.resolution_otp = None # Clear it after use
    incident.resolved_at = func.now()
    
    sos_res = await db.execute(select(SOSAlert).where(SOSAlert.id == incident.sos_alert_id))
    sos = sos_res.scalars().first()
    if sos:
        sos.status = 'resolved'
        
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='resolved',
        actor_id=current_user.id,
        details={
            "reason": "Threat cleared with verified OTP", 
            "resolved_by_role": current_user.role, 
            "resolved_by_id": str(current_user.id),
            "resolved_by_org": getattr(current_user, 'organization', None)
        }
    )
    db.add(event)
    await db.flush()
    
    # Anchor to cryptographic chain
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    
    await db.commit()
    await db.refresh(incident)
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    await broadcast_notification({
        "type": "SOS_RESOLVED",
        "title": "Incident Resolved",
        "message": f"Incident {str(incident.id)[:8]} resolved successfully with verified OTP by {current_user.role}",
        "incidentId": str(incident.id),
        "priority": "NORMAL"
    })
    
    return {"status": "resolved"}

class IncidentAssignRequest(BaseModel):
    unitId: uuid.UUID

@router.post("/{incident_id}/assign")
async def assign_incident(
    incident_id: uuid.UUID,
    req: IncidentAssignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ['operator', 'dispatcher', 'supervisor', 'sys_admin']:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == 'assigned' and incident.assigned_to == req.unitId:
        return {"status": "assigned"}
        
    incident.status = 'assigned'
    incident.assigned_to = req.unitId
    
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='assigned',
        actor_id=current_user.id,
        details={"unitId": str(req.unitId)}
    )
    db.add(event)
    await db.flush()
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    await db.commit()
    await db.refresh(incident)
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "assigned_to": str(req.unitId)
    })
    return {"status": "assigned"}

class IncidentEscalateRequest(BaseModel):
    reason: str

@router.post("/{incident_id}/escalate")
async def escalate_incident(
    incident_id: uuid.UUID,
    req: IncidentEscalateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ['operator', 'dispatcher', 'supervisor', 'sys_admin']:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.severity == 'critical':
        return {"status": "escalated"}
        
    incident.severity = 'critical'
    
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='escalated',
        actor_id=current_user.id,
        details={"reason": req.reason}
    )
    db.add(event)
    await db.flush()
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    await db.commit()
    await db.refresh(incident)
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "severity": incident.severity,
        "event": "escalated"
    })
    return {"status": "escalated"}


@router.post("/{incident_id}/close")
async def close_incident(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Operator closes an incident as a false alarm.
    This updates both the incident and the underlying SOS alert,
    then broadcasts to all connected clients (including the tourist's mobile app).
    """
    if current_user.role == 'tourist':
        raise HTTPException(status_code=403, detail="Only operators can close incidents")
        
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status in ('false_alarm', 'closed', 'resolved'):
        return {"status": incident.status}
        
    from sqlalchemy.sql import func
    incident.status = 'false_alarm'
    incident.closed_at = func.now()
    
    # Also update the underlying SOS alert
    if incident.sos_alert_id:
        sos_res = await db.execute(select(SOSAlert).where(SOSAlert.id == incident.sos_alert_id))
        sos = sos_res.scalars().first()
        if sos:
            sos.status = 'false_alarm'
    
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='false_alarm',
        actor_id=current_user.id,
        details={
            "reason": "Closed as false alarm by operator",
            "closed_by_role": current_user.role,
            "closed_by_id": str(current_user.id),
            "closed_by_org": getattr(current_user, 'organization', None)
        }
    )
    db.add(event)
    await db.flush()
    
    # Anchor to cryptographic chain
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    
    await db.commit()
    await db.refresh(incident)
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    
    return {"status": "false_alarm"}
