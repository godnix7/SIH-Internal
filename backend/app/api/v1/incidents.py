import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.core.middleware import get_current_user
from app.models.auth import User
from app.models.incident import Incident, IncidentEvent
from app.models.sos import SOSAlert
from app.schemas.sos import IncidentResponse, IncidentEventSchema, SOSAcknowledgeRequest

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
        details={"unitId": str(req.unitId), "etaMinutes": req.etaMinutes}
    )
    db.add(event)
    await db.commit()
    
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
    await db.commit()
    
    return {"status": "resolved"}
