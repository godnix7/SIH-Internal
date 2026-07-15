from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from uuid import UUID
from datetime import datetime
import hashlib
import json

from app.database import get_db
from app.core.middleware import get_current_user
from app.models.auth import User
from app.models.trip import Trip, ConsentReceipt
from app.schemas.trip import TripCreate, TripTierUpdate, TripResponse

router = APIRouter()

def create_receipt_hash(user_id: UUID, trip_id: UUID, consent_tier: str, timestamp: datetime) -> str:
    payload = f"{user_id}:{trip_id}:{consent_tier}:{timestamp.isoformat()}"
    return hashlib.sha256(payload.encode()).hexdigest()

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_in: TripCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    trip = Trip(
        user_id=current_user.id,
        destination=trip_in.destination,
        start_date=trip_in.start_date,
        end_date=trip_in.end_date,
        consent_tier=trip_in.consent_tier,
        status='draft',
        monitoring_mode='IDLE'
    )
    db.add(trip)
    await db.flush()

    # Generate an initial consent receipt
    now = datetime.utcnow()
    purpose = "Initial trip creation consent"
    receipt_hash = create_receipt_hash(current_user.id, trip.id, trip.consent_tier, now)
    
    receipt = ConsentReceipt(
        user_id=current_user.id,
        trip_id=trip.id,
        consent_tier=trip.consent_tier,
        purpose_text=purpose,
        granted_at=now,
        receipt_hash=receipt_hash
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(trip)
    return trip

@router.post("/{trip_id}/start", response_model=TripResponse)
async def start_trip(
    trip_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id))
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if trip.status != 'draft':
        raise HTTPException(status_code=400, detail="Only draft trips can be started")

    trip.status = 'active'
    trip.monitoring_mode = 'ACTIVE_TRIP'
    trip.started_at = datetime.utcnow()
    await db.commit()
    await db.refresh(trip)
    return trip

@router.put("/{trip_id}/tier", response_model=TripResponse)
async def update_trip_tier(
    trip_id: UUID,
    tier_in: TripTierUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id))
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    old_tier = trip.consent_tier
    trip.consent_tier = tier_in.consent_tier
    
    now = datetime.utcnow()
    purpose = f"Tier updated from {old_tier} to {tier_in.consent_tier}"
    receipt_hash = create_receipt_hash(current_user.id, trip.id, tier_in.consent_tier, now)
    
    receipt = ConsentReceipt(
        user_id=current_user.id,
        trip_id=trip.id,
        consent_tier=tier_in.consent_tier,
        previous_tier=old_tier,
        purpose_text=purpose,
        granted_at=now,
        receipt_hash=receipt_hash
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(trip)
    return trip

@router.post("/{trip_id}/end", response_model=TripResponse)
async def end_trip(
    trip_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id))
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.status not in ['active', 'paused']:
        raise HTTPException(status_code=400, detail="Trip cannot be ended")

    trip.status = 'ended'
    trip.monitoring_mode = 'IDLE'
    trip.ended_at = datetime.utcnow()
    await db.commit()
    await db.refresh(trip)
    return trip
