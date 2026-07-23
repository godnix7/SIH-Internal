from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import Dict, Any, List

from app.database import get_db
from app.models.risk import RiskEvent, TripRisk
from app.services import risk_engine

router = APIRouter()

@router.post("/vector")
async def inject_vector(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest a RiskVector from the Edge AI.
    Payload should contain anomalyType, riskScore, confidenceScore, etc.
    """
    trip_id = payload.get("tripId")
    if not trip_id:
        # In a real app we'd look up the active trip via current_user
        # For now, require it in payload or error gracefully
        raise HTTPException(status_code=400, detail="Missing tripId in vector")
        
    try:
        result = await risk_engine.inject_risk_vector(db, UUID(trip_id), payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/challenge/respond")
async def respond_to_challenge(
    trip_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    User responds "I'm OK" to an active challenge.
    """
    try:
        await risk_engine.resolve_challenge(db, trip_id)
        return {"status": "success", "message": "Challenge resolved, score reset"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trip/{trip_id}/events")
async def get_risk_events(
    trip_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns active risk events and the total score for a trip.
    """
    try:
        # Get active events
        result = await db.execute(
            select(RiskEvent).where(RiskEvent.trip_id == trip_id, RiskEvent.is_active == True)
        )
        events = result.scalars().all()
        
        # Get total score
        score_result = await db.execute(
            select(TripRisk).where(TripRisk.trip_id == trip_id)
        )
        trip_risk = score_result.scalars().first()
        total_score = trip_risk.current_score if trip_risk else 0
        
        return {
            "status": "success",
            "total_score": total_score,
            "events": [{"factor": e.factor_type, "points": e.points, "time": e.created_at} for e in events]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
