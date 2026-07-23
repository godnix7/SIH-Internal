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
from app.schemas.sos import IncidentResponse, IncidentEventSchema, SOSAcknowledgeRequest
from app.core.socket import broadcast_incident_update
from app.services.blockchain import BlockchainService

router = APIRouter()

@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List active incidents.
    In a real system, this would filter by the operator's jurisdiction.
    For this MVP, we return incidents for the current user (if tourist) or all if operator.
    """
    if current_user.role == 'tourist':
        stmt = select(Incident).where(Incident.user_id == current_user.id)
    else:
        stmt = select(Incident).where(Incident.status.notin_(['closed', 'cancelled', 'false_alarm', 'merged']))
        
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
        
        responses.append(IncidentResponse(
            id=inc.id,
            sosAlertId=inc.sos_alert_id,
            status=inc.status,
            severity=inc.severity,
            type=inc.type,
            createdAt=inc.created_at,
            updatedAt=inc.updated_at,
            events=event_schemas
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
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    
    return {"status": "acknowledged", "acknowledgedBy": str(current_user.id)}

@router.post("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: uuid.UUID,
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
        
    incident.status = 'resolved'
    
    sos_res = await db.execute(select(SOSAlert).where(SOSAlert.id == incident.sos_alert_id))
    sos = sos_res.scalars().first()
    if sos:
        sos.status = 'resolved'
        
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='resolved',
        actor_id=current_user.id,
        details={"reason": "Threat cleared"}
    )
    db.add(event)
    await db.flush()
    
    # Anchor to cryptographic chain
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    
    await db.commit()
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
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
    
    await broadcast_incident_update({
        "id": str(incident.id),
        "severity": incident.severity,
        "event": "escalated"
    })
    return {"status": "escalated"}
