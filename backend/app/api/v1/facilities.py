from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.functions import ST_DWithin, ST_SetSRID, ST_MakePoint
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models.facility import Facility
from app.core.middleware import get_current_user
from app.models.auth import User

router = APIRouter()

class FacilityCreateRequest(BaseModel):
    name: str
    type: str # 'hospital', 'police', 'safe_zone'
    phone: str | None = None
    address: str | None = None
    lat: float
    lng: float

class FacilityResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    phone: str | None
    address: str | None
    
@router.get("/nearby", response_model=List[FacilityResponse])
async def get_nearby_facilities(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_m: float = Query(5000),
    db: AsyncSession = Depends(get_db)
):
    # Query facilities within radius_m using PostGIS ST_DWithin
    # Note: 4326 is lon/lat. PostGIS ST_DWithin with geometry (srid=4326) calculates in degrees.
    # We should cast to geography for meters, or just approximate.
    # Casting to geography:
    # ST_DWithin(geometry::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_m)
    
    from sqlalchemy import cast
    from geoalchemy2 import Geography

    point = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    
    stmt = select(Facility).where(
        ST_DWithin(
            cast(Facility.geometry, Geography), 
            cast(point, Geography), 
            radius_m
        )
    )
    result = await db.execute(stmt)
    facilities = result.scalars().all()
    
    return [
        FacilityResponse(
            id=f.id,
            name=f.name,
            type=f.type,
            phone=f.phone,
            address=f.address
        ) for f in facilities
    ]

@router.post("/", response_model=FacilityResponse)
async def create_facility(
    request: FacilityCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new facility (Hospital, Police, Safe Zone) on the map.
    Only accessible by sys_admin or tourism_admin.
    """
    if current_user.role not in ['sys_admin', 'tourism_admin']:
        raise HTTPException(status_code=403, detail="Unauthorized to add facilities")
        
    point = f"SRID=4326;POINT({request.lng} {request.lat})"
    
    new_facility = Facility(
        id=uuid.uuid4(),
        name=request.name,
        type=request.type,
        phone=request.phone,
        address=request.address,
        geometry=point
    )
    
    db.add(new_facility)
    await db.commit()
    await db.refresh(new_facility)
    
    return FacilityResponse(
        id=new_facility.id,
        name=new_facility.name,
        type=new_facility.type,
        phone=new_facility.phone,
        address=new_facility.address
    )
