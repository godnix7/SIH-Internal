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
from app.schemas.sos import SOSCreateRequest, SOSResponse, SOSCancelRequest, SOSAcknowledgeRequest, SmsIngestRequest
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

@router.post("/sms-ingest")
async def sms_ingest(
    req: SmsIngestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook for SMS provider.
    Expected payload format: SOS|v1|<clientSosId>|<lat>|<lon>|<acc>|<ts>
    """
    from app.core.security import get_phone_hash
    from datetime import datetime
    import logging
    logger = logging.getLogger(__name__)

    # 1. Parse Payload
    parts = req.payload.strip().split('|')
    if len(parts) < 7 or parts[0] != "SOS":
        raise HTTPException(status_code=400, detail="Invalid payload format")
        
    version = parts[1]
    client_sos_id_str = parts[2]
    lat_str = parts[3]
    lon_str = parts[4]
    acc_str = parts[5]
    ts_str = parts[6]
    
    try:
        client_sos_id = uuid.UUID(client_sos_id_str)
        lat = float(lat_str)
        lon = float(lon_str)
        acc = float(acc_str)
        # Parse TS if provided, or use now
        try:
            ts_int = int(ts_str)
            location_ts = datetime.fromtimestamp(ts_int / 1000.0)
        except:
            location_ts = datetime.utcnow()
    except Exception as e:
        logger.error(f"Error parsing SMS payload parts: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload data types")
        
    # 2. Look up User by Phone
    # Normalize phone number and hash it
    # In a real app we'd carefully format the E164 string
    phone_hash = get_phone_hash(req.sender_phone)
    user_result = await db.execute(select(User).where(User.phone_hash == phone_hash))
    user = user_result.scalars().first()
    
    if not user:
        logger.warning(f"SMS Ingest: Unknown sender {req.sender_phone}")
        # Return 200 so the SMS gateway stops retrying, but log warning
        return {"status": "accepted_but_unmatched"}

    # 3. Idempotency Check
    existing_result = await db.execute(select(SOSAlert).where(SOSAlert.client_sos_id == client_sos_id))
    existing_sos = existing_result.scalars().first()
    
    if existing_sos:
        return {"status": "duplicate", "sosId": existing_sos.id}
        
    # 4. Create SOSAlert
    location_wkt = f"SRID=4326;POINT({lon} {lat})"
        
    sos_alert = SOSAlert(
        client_sos_id=client_sos_id,
        user_id=user.id,
        trip_id=None, # Cannot derive trip from SMS easily unless passed
        type="general",
        location=location_wkt,
        accuracy_m=acc,
        location_ts=location_ts,
        source='sms',
        status='received'
    )
    db.add(sos_alert)
    await db.flush()
    
    # 5. Create Incident
    incident = Incident(
        sos_alert_id=sos_alert.id,
        user_id=user.id,
        trip_id=None,
        type="general",
        severity="HIGH",
        status='created',
        location=location_wkt
    )
    db.add(incident)
    await db.flush()
    
    sos_alert.incident_id = incident.id
    
    event = IncidentEvent(
        incident_id=incident.id,
        event_type='created',
        actor_id=user.id,
        details={"source": "sms_fallback"}
    )
    db.add(event)
    
    await db.commit()
    
    # 6. Dispatch background notifications
    background_tasks.add_task(notify_emergency_contacts, user.id, incident.id)
    
    return {"status": "created", "sosId": sos_alert.id, "incidentId": incident.id}

