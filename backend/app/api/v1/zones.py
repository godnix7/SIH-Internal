from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import json

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
