from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from uuid import UUID
from datetime import datetime

from app.models.trip import Trip
from app.models.risk import TripRisk, RiskEvent
from app.models.sos import SOSAlert

# AI Incident Detection & Risk Assessment Engine (Phase 2)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from uuid import UUID
from datetime import datetime
from typing import Dict, Any

from app.models.trip import Trip
from app.models.risk import TripRisk, RiskEvent
from app.models.sos import SOSAlert

CHALLENGE_THRESHOLD = 75
CRITICAL_CONFIDENCE_THRESHOLD = 80

async def inject_risk_vector(db: AsyncSession, trip_id: UUID, vector: Dict[str, Any]) -> dict:
    """
    Ingests a normalized RiskVector from the Edge AI.
    Calculates the final confidence (applying backend contextual multipliers)
    and decides whether to trigger Level 4 SOS immediately.
    """
    anomaly_type = vector.get('anomalyType', 'UNKNOWN')
    base_risk = vector.get('riskScore', 0)
    edge_confidence = vector.get('confidenceScore', 0)
    corroboration = vector.get('corroboration', {})
    
    # 1. Cloud-side Contextual Adjustments
    # E.g., If they are in a known disaster zone, increase confidence.
    final_confidence = edge_confidence
    
    # Check trip status/location here if we had full location tracking.
    
    # Create the event
    event = RiskEvent(
        trip_id=trip_id,
        factor_type=anomaly_type,
        points=base_risk,
        confidence=final_confidence,
        details=corroboration,
        is_active=True,
    )
    db.add(event)
    await db.flush()
    
    # Recalculate trip's cumulative score
    new_total_score = await recalculate_trip_risk(db, trip_id)
    
    # Level 4 Evaluation: Does this single event have Critical Confidence, OR
    # is the cumulative score massive?
    if final_confidence >= CRITICAL_CONFIDENCE_THRESHOLD and base_risk >= 70:
        await escalate_to_sos(db, trip_id, event.id, "CRITICAL_CONFIDENCE_REACHED")
        return {"status": "sos_triggered", "new_score": new_total_score, "confidence": final_confidence}
        
    elif new_total_score >= CHALLENGE_THRESHOLD:
        await initiate_challenge(db, trip_id)
        
    return {"status": "logged", "new_score": new_total_score, "confidence": final_confidence}


async def escalate_to_sos(db: AsyncSession, trip_id: UUID, event_id: UUID, reason: str):
    """
    Triggers the SOS workflow autonomously due to high confidence risk.
    """
    print(f"[RISK ENGINE] CRITICAL THRESHOLD REACHED. Dispatching Auto-SOS for Trip {trip_id}. Reason: {reason}")
    # In production, we would inject directly into the SOS endpoints/models here.
    # For now, we update the trip status to indicate the escalation.
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalars().first()
    if trip:
        trip.monitoring_mode = 'EMERGENCY'
        await db.flush()
        # The background worker would pick this up and call notify_emergency_contacts.


async def resolve_risk_factor(db: AsyncSession, event_id: UUID) -> int:
    result = await db.execute(select(RiskEvent).where(RiskEvent.id == event_id))
    event = result.scalars().first()
    if event and event.is_active:
        event.is_active = False
        event.resolved_at = datetime.utcnow()
        await db.flush()
        return await recalculate_trip_risk(db, event.trip_id)
    return 0

async def recalculate_trip_risk(db: AsyncSession, trip_id: UUID) -> int:
    result = await db.execute(
        select(RiskEvent).where(RiskEvent.trip_id == trip_id, RiskEvent.is_active == True)
    )
    active_events = result.scalars().all()
    
    total_score = sum(event.points for event in active_events)
    
    risk_result = await db.execute(select(TripRisk).where(TripRisk.trip_id == trip_id))
    trip_risk = risk_result.scalars().first()
    
    if not trip_risk:
        trip_risk = TripRisk(trip_id=trip_id, current_score=total_score)
        db.add(trip_risk)
    else:
        trip_risk.current_score = total_score
        trip_risk.last_calculated_at = datetime.utcnow()
        
    await db.flush()
    return total_score

async def initiate_challenge(db: AsyncSession, trip_id: UUID):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalars().first()
    if trip and trip.monitoring_mode != 'HIGH_RISK':
        trip.monitoring_mode = 'HIGH_RISK'
        await db.flush()
        print(f"[RISK ENGINE] Challenge initiated for trip {trip_id}. Mode -> HIGH_RISK.")

async def resolve_challenge(db: AsyncSession, trip_id: UUID):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalars().first()
    
    if trip:
        trip.monitoring_mode = 'ACTIVE_TRIP'
        
    await db.execute(
        update(RiskEvent)
        .where(RiskEvent.trip_id == trip_id, RiskEvent.is_active == True)
        .values(is_active=False, resolved_at=datetime.utcnow())
    )
    
    await db.execute(
        update(TripRisk)
        .where(TripRisk.trip_id == trip_id)
        .values(current_score=0, last_calculated_at=datetime.utcnow())
    )
    await db.commit()
