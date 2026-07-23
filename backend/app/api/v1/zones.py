from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import json
from pydantic import BaseModel
import uuid
from geoalchemy2.functions import ST_GeomFromGeoJSON

from app.database import get_db
from app.core.middleware import get_current_user
from app.models.auth import User
from app.models.zone import Zone
from app.schemas.zone import ZoneResponse
from sqlalchemy import func

router = APIRouter()

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
        # Convert SQLAlchemy model to Pydantic model implicitly or explicitly
        zone_dict = {
            "id": zone.id,
            "name": zone.name,
            "zone_class": zone.zone_class,
            "buffer_m": zone.buffer_m,
            "schedule": zone.schedule,
            "description": zone.description,
            "status": zone.status,
            "version": zone.version,
            "geometry_geojson": json.loads(geojson_str) if geojson_str else None
        }
        response.append(ZoneResponse(**zone_dict))
        
    return response

class ZoneCreateRequest(BaseModel):
    name: str
    zone_class: str
    buffer_m: float
    description: Optional[str] = None
    geometry_geojson: dict

@router.post("/", response_model=ZoneResponse)
async def create_zone(
    req: ZoneCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ['sys_admin', 'tourism_admin']:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    geojson_str = json.dumps(req.geometry_geojson)
    
    zone = Zone(
        id=uuid.uuid4(),
        name=req.name,
        zone_class=req.zone_class,
        buffer_m=req.buffer_m,
        description=req.description,
        status='active',
        version=1,
        created_by=current_user.id,
        geometry=ST_GeomFromGeoJSON(geojson_str)
    )
    
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    
    return ZoneResponse(
        id=zone.id,
        name=zone.name,
        zone_class=zone.zone_class,
        buffer_m=zone.buffer_m,
        schedule=zone.schedule,
        description=zone.description,
        status=zone.status,
        version=zone.version,
        geometry_geojson=req.geometry_geojson
    )
