from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import json
import uuid
from geoalchemy2.functions import ST_GeomFromGeoJSON

from app.database import get_db
from app.core.middleware import get_current_user
from app.models.auth import User
from app.models.zone import Zone
from app.schemas.zone import ZoneResponse, ZoneCreateRequest, ZoneUpdateRequest
from app.services.safety_score import compute_safety_score
from sqlalchemy import func

router = APIRouter()

ZONE_MANAGEMENT_ROLES = ['sys_admin', 'tourism_admin', 'police_admin', 'responder']

def _zone_to_response(zone, geojson_str=None) -> ZoneResponse:
    """Convert a Zone model instance to ZoneResponse."""
    return ZoneResponse(
        id=zone.id,
        name=zone.name,
        zone_class=zone.zone_class,
        buffer_m=zone.buffer_m,
        schedule=zone.schedule,
        description=zone.description,
        status=zone.status,
        version=zone.version,
        geometry_geojson=json.loads(geojson_str) if geojson_str else None,
        safety_score=zone.safety_score if zone.safety_score is not None else 100,
        crime_data=zone.crime_data or [],
        risk_factors=zone.risk_factors or [],
        total_incidents=zone.total_incidents or 0,
    )


@router.get("/pack", response_model=List[ZoneResponse])
async def get_zone_pack(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Query active zones, converting PostGIS geometry to GeoJSON
    stmt = select(
        Zone,
        func.ST_AsGeoJSON(Zone.geometry).label('geometry_geojson')
    ).where(Zone.status == 'active')
    
    result = await db.execute(stmt)
    zones_data = result.all()
    
    response = []
    for zone, geojson_str in zones_data:
        response.append(_zone_to_response(zone, geojson_str))
        
    return response


@router.get("/all", response_model=List[ZoneResponse])
async def get_all_zones(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all zones (including inactive) for management purposes."""
    if current_user.role not in ZONE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    stmt = select(
        Zone,
        func.ST_AsGeoJSON(Zone.geometry).label('geometry_geojson')
    ).order_by(Zone.created_at.desc())
    
    result = await db.execute(stmt)
    zones_data = result.all()
    
    return [_zone_to_response(zone, geojson_str) for zone, geojson_str in zones_data]


@router.get("/safety-scores")
async def get_zone_safety_scores(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all active zones with their safety scores for mobile consumption."""
    stmt = select(
        Zone.id, Zone.name, Zone.zone_class, Zone.safety_score, 
        Zone.total_incidents, Zone.risk_factors,
        func.ST_AsGeoJSON(Zone.geometry).label('geometry_geojson')
    ).where(Zone.status == 'active')
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "zone_class": row.zone_class,
            "safety_score": row.safety_score if row.safety_score is not None else 100,
            "total_incidents": row.total_incidents or 0,
            "risk_factors": row.risk_factors or [],
            "geometry_geojson": json.loads(row.geometry_geojson) if row.geometry_geojson else None,
        }
        for row in rows
    ]


@router.post("/", response_model=ZoneResponse)
async def create_zone(
    req: ZoneCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ZONE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    geojson_str = json.dumps(req.geometry_geojson)
    
    # Compute safety score from crime data if provided
    crime_list = req.crime_data or []
    score = req.safety_score if req.safety_score is not None else compute_safety_score(crime_list)
    
    zone = Zone(
        id=uuid.uuid4(),
        name=req.name,
        zone_class=req.zone_class,
        buffer_m=req.buffer_m,
        description=req.description or '',
        status='active',
        version=1,
        created_by=current_user.id,
        geometry=ST_GeomFromGeoJSON(geojson_str),
        safety_score=score,
        crime_data=crime_list,
        risk_factors=req.risk_factors or [],
        total_incidents=len(crime_list),
    )
    
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    
    return _zone_to_response(zone, geojson_str)


@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: uuid.UUID,
    req: ZoneUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update zone crime data, safety score, and metadata."""
    if current_user.role not in ZONE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalars().first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    if req.name is not None:
        zone.name = req.name
    if req.zone_class is not None:
        zone.zone_class = req.zone_class
    if req.buffer_m is not None:
        zone.buffer_m = req.buffer_m
    if req.description is not None:
        zone.description = req.description
    if req.status is not None:
        zone.status = req.status
    if req.risk_factors is not None:
        zone.risk_factors = req.risk_factors

    if req.crime_data is not None:
        zone.crime_data = req.crime_data
        zone.total_incidents = len(req.crime_data)
        # Recompute safety score based on updated crime data
        zone.safety_score = req.safety_score if req.safety_score is not None else compute_safety_score(req.crime_data)
    elif req.safety_score is not None:
        zone.safety_score = req.safety_score

    zone.version = (zone.version or 1) + 1

    await db.commit()
    await db.refresh(zone)

    # Get GeoJSON for response
    geojson_result = await db.scalar(select(func.ST_AsGeoJSON(Zone.geometry)).where(Zone.id == zone_id))
    
    return _zone_to_response(zone, geojson_result)


@router.delete("/{zone_id}")
async def delete_zone(
    zone_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a zone by setting status to 'deleted'."""
    if current_user.role not in ZONE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalars().first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    zone.status = 'deleted'
    await db.commit()
    
    return {"status": "deleted", "id": str(zone_id)}
