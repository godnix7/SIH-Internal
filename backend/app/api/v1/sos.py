import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.core.middleware import get_current_user
from app.models.auth import User
from app.models.sos import SOSAlert
from app.models.incident import Incident, IncidentEvent
from app.schemas.sos import SOSCreateRequest, SOSResponse, SOSCancelRequest, SOSAcknowledgeRequest
from app.services.notification import notify_emergency_contacts

router = APIRouter()

@router.post("", response_model=SOSResponse, status_code=202)
async def trigger_sos(
    req: SOSCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Idempotent endpoint to trigger an SOS alert and immediately create an incident.
    """
    # 1. Idempotency Check
    result = await db.execute(select(SOSAlert).where(SOSAlert.client_sos_id == req.clientSosId))
    existing_sos = result.scalars().first()
    
    if existing_sos:
        return SOSResponse(
            sosId=existing_sos.id,
            incidentId=existing_sos.incident_id,
            status=existing_sos.status,
            ackSlaSec=60
        )
        
    # 2. Create SOSAlert
    # Convert location to WKT
    location_wkt = None
    if req.location:
        location_wkt = f"SRID=4326;POINT({req.location.lon} {req.location.lat})"
        
    sos_alert = SOSAlert(
        client_sos_id=req.clientSosId,
        user_id=current_user.id,
        trip_id=req.tripId,
        type=req.type,
        location=location_wkt,
        accuracy_m=req.location.accM if req.location else None,
        location_ts=req.location.ts if req.location else None,
        battery_pct=req.battery,
        network_type=req.network,
        note=req.note,
        source='app',
        covert=req.covert,
        status='received'
    )
    db.add(sos_alert)
    await db.flush() # Get sos_alert.id
    
    # 3. Create Incident
    # Severity mapping
    severity = "HIGH"
    if req.type == 'medical':
        severity = "CRITICAL"
    elif req.type == 'police':
        severity = "CRITICAL"
    elif req.type == 'silent' or req.covert:
        severity = "CRITICAL"
        
    incident = Incident(
        sos_alert_id=sos_alert.id,
        user_id=current_user.id,
        trip_id=req.tripId,
        type=req.type,
        severity=severity,
        status='created',
        location=location_wkt
    )
    db.add(incident)
    await db.flush()
    
    # Link incident to SOS
    sos_alert.incident_id = incident.id
    
    # 4. Event Log
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='created',
        actor_id=current_user.id,
        details={"source": "app_sos", "covert": req.covert}
    )
    db.add(event)
    
    await db.commit()
    
    # 5. Dispatch background notifications
    background_tasks.add_task(notify_emergency_contacts, current_user.id, incident.id)
    
    return SOSResponse(
        sosId=sos_alert.id,
        incidentId=incident.id,
        status=sos_alert.status,
        ackSlaSec=60
    )


@router.post("/{sos_id}/cancel")
async def cancel_sos(
    sos_id: uuid.UUID,
    req: SOSCancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SOSAlert).where(SOSAlert.id == sos_id, SOSAlert.user_id == current_user.id))
    sos_alert = result.scalars().first()
    
    if not sos_alert:
        raise HTTPException(status_code=404, detail="SOS not found")
        
    # We allow cancellation even if acknowledged.
    sos_alert.status = 'false_alarm'
    
    # Update incident
    inc_result = await db.execute(select(Incident).where(Incident.id == sos_alert.incident_id))
    incident = inc_result.scalars().first()
    if incident:
        incident.status = 'false_alarm'
        
        event = IncidentEvent(
            incident_id=incident.id,
            event_type='cancelled',
            actor_id=current_user.id,
            details={"reason": req.reason, "notes": req.notes}
        )
        db.add(event)
        
    await db.commit()
    return {"status": "cancelled"}
