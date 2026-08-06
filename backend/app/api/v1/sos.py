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
from app.schemas.sos import SOSCreateRequest, SOSResponse, SOSCancelRequest, SOSAcknowledgeRequest, SmsIngestRequest, MeshIngestRequest
from app.services.notification import notify_emergency_contacts
from app.core.socket import broadcast_incident_update, broadcast_notification
from app.services.blockchain import BlockchainService

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
        
    valid_trip_id = None
    if req.tripId and str(req.tripId) != 'EMERGENCY_DIRECT':
        try:
            valid_trip_id = uuid.UUID(str(req.tripId))
        except (ValueError, TypeError, AttributeError):
            valid_trip_id = None

    sos_alert = SOSAlert(
        client_sos_id=req.clientSosId,
        user_id=current_user.id,
        trip_id=valid_trip_id,
        type=req.type,
        location=location_wkt,
        accuracy_m=req.location.accM if req.location else None,
        location_ts=req.location.ts if req.location else None,
        battery_pct=req.battery,
        network_type=req.network,
        note=req.note,
        source='app',
        covert=req.covert or bool(req.silent),
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
    elif req.type == 'silent' or req.covert or req.silent:
        severity = "CRITICAL"
        
    incident = Incident(
        sos_alert_id=sos_alert.id,
        user_id=current_user.id,
        trip_id=valid_trip_id,
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
    await db.flush()
    
    # Anchor to cryptographic chain
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    
    await db.commit()
    
    # 5. Dispatch background notifications
    background_tasks.add_task(notify_emergency_contacts, current_user.id, incident.id)
    
    # Refresh to avoid MissingGreenlet error when accessing attributes after commit
    await db.refresh(incident)

    # 6. Broadcast real-time update and critical notification
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    await broadcast_notification({
        "type": "SOS_TRIGGERED",
        "title": "CRITICAL: New SOS Alert Triggered",
        "message": f"Emergency SOS triggered (ID: {str(incident.id)[:8]}, Type: {incident.type})",
        "incidentId": str(incident.id),
        "priority": "CRITICAL"
    })
    
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
    from sqlalchemy import or_
    result = await db.execute(
        select(SOSAlert).where(
            or_(SOSAlert.id == sos_id, SOSAlert.client_sos_id == str(sos_id)),
            SOSAlert.user_id == current_user.id
        )
    )
    sos_alert = result.scalars().first()
    
    if not sos_alert:
        raise HTTPException(status_code=404, detail="SOS not found")
        
    if sos_alert.status in ('cancelled', 'cancelled_by_user'):
        return {"status": "cancelled_by_user"}
        
    from sqlalchemy.sql import func
    sos_alert.status = 'cancelled_by_user'
    
    incident = None
    if sos_alert.incident_id:
        inc_result = await db.execute(select(Incident).where(Incident.id == sos_alert.incident_id))
        incident = inc_result.scalars().first()
        if incident:
            incident.status = 'cancelled_by_user'
            incident.closed_at = func.now()
            
            event = IncidentEvent(
                incident_id=incident.id,
                event_type='cancelled_by_user',
                actor_id=current_user.id,
                details={
                    "reason": req.reason or "User verified safety via Safe PIN", 
                    "notes": req.notes, 
                    "cancelled_by_role": current_user.role, 
                    "cancelled_by_id": str(current_user.id),
                    "cancelled_by_org": getattr(current_user, 'organization', None)
                }
            )
            db.add(event)
            await db.flush()
            
            await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    
    await db.commit()
    
    if incident:
        await db.refresh(incident)
        await broadcast_incident_update({
            "id": str(incident.id),
            "status": incident.status,
            "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
        })
        await broadcast_notification({
            "type": "SOS_CANCELLED_BY_USER",
            "title": "SOS Cancelled by User",
            "message": f"Incident {str(incident.id)[:8]} has been explicitly cancelled by user via Safe PIN",
            "incidentId": str(incident.id),
            "priority": "HIGH"
        })
        
    return {"status": "cancelled_by_user"}

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
    import base64
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import padding
    from app.config import settings
    logger = logging.getLogger(__name__)

    # 1. Parse Payload
    raw_payload = req.payload.strip()
    
    # Decrypt if encrypted
    if raw_payload.startswith("YATRI_SOS_ENC|"):
        try:
            _, iv_hex, ct_b64 = raw_payload.split('|')
            iv = bytes.fromhex(iv_hex)
            ct = base64.b64decode(ct_b64)
            key = settings.SMS_ENCRYPTION_KEY.encode('utf-8')
            
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            padded_pt = decryptor.update(ct) + decryptor.finalize()
            
            unpadder = padding.PKCS7(128).unpadder()
            pt = unpadder.update(padded_pt) + unpadder.finalize()
            raw_payload = pt.decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to decrypt SMS payload: {e}")
            raise HTTPException(status_code=400, detail="Decryption failed")

    parts = raw_payload.split('|')
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
    await db.flush()
    
    # Anchor to cryptographic chain
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    
    await db.commit()
    
    # 6. Dispatch background notifications
    background_tasks.add_task(notify_emergency_contacts, user.id, incident.id)
    
    # 7. Broadcast real-time update
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    
    return {"status": "created", "sosId": sos_alert.id, "incidentId": incident.id}

@router.post("/mesh-ingest")
async def mesh_ingest(
    req: MeshIngestRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user), # The relaying user
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook for BLE Mesh P2P SOS relay.
    Accepts base64 encoded compressed payload from a nearby tourist's phone.
    """
    import base64
    import logging
    from datetime import datetime
    logger = logging.getLogger(__name__)
    
    try:
        decoded = base64.b64decode(req.payload).decode('utf-8')
        parts = decoded.split('|')
        if len(parts) < 4:
            raise ValueError("Invalid mesh payload segments")
            
        client_sos_id = uuid.UUID(parts[0])
        lat = float(parts[1])
        lon = float(parts[2])
        signature = parts[3] # We would verify this against the victim's public key
    except Exception as e:
        logger.error(f"Mesh Ingest error: {e}")
        raise HTTPException(status_code=400, detail="Invalid mesh payload")
        
    # Idempotency Check
    existing_result = await db.execute(select(SOSAlert).where(SOSAlert.client_sos_id == client_sos_id))
    existing_sos = existing_result.scalars().first()
    
    if existing_sos:
        return {"status": "duplicate", "sosId": existing_sos.id}
        
    location_wkt = f"SRID=4326;POINT({lon} {lat})"
        
    # Create SOSAlert - Without a real signature verification, we assign it to a "Mesh Relay" system context,
    # but in a real app, the signature proves who the victim was.
    sos_alert = SOSAlert(
        client_sos_id=client_sos_id,
        user_id=current_user.id, # In reality, we'd look up the victim's ID from the payload/signature
        trip_id=None,
        type="general",
        location=location_wkt,
        accuracy_m=50.0,
        location_ts=datetime.utcnow(),
        source='mesh',
        status='received',
        note=f"Relayed via BLE Mesh by User {current_user.id}"
    )
    db.add(sos_alert)
    await db.flush()
    
    incident = Incident(
        sos_alert_id=sos_alert.id,
        user_id=current_user.id,
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
        actor_id=current_user.id,
        details={"source": "ble_mesh", "relay_user": str(current_user.id)}
    )
    db.add(event)
    await db.flush()
    
    await BlockchainService.append_event(db, str(incident.id), str(event.id), event.event_type, event.details)
    await db.commit()
    
    background_tasks.add_task(notify_emergency_contacts, current_user.id, incident.id)
    await broadcast_incident_update({
        "id": str(incident.id),
        "status": incident.status,
        "updatedAt": int(incident.updated_at.timestamp() * 1000) if incident.updated_at else None
    })
    
    return {"status": "created", "sosId": sos_alert.id, "incidentId": incident.id}

