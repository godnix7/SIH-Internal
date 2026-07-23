from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.middleware import get_current_user
from app.database import get_db
from app.models.auth import User
from app.models.incident import Incident
from app.models.trip import Trip

router = APIRouter()

@router.get("/overview")
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns aggregated analytics for the Tourism Authority Dashboard
    using actual database queries.
    """
    # Count tourists
    tourists_query = await db.execute(select(func.count(User.id)).where(User.role == 'tourist'))
    tourist_count = tourists_query.scalar() or 0
    
    # Count active trips
    trips_query = await db.execute(select(func.count(Trip.id)).where(Trip.status == 'active'))
    active_trips = trips_query.scalar() or 0
    
    # Count total incidents
    incidents_query = await db.execute(select(func.count(Incident.id)))
    total_incidents = incidents_query.scalar() or 0
    
    # Group incidents by severity
    severity_query = await db.execute(
        select(Incident.severity, func.count(Incident.id))
        .group_by(Incident.severity)
    )
    severity_counts = {k.upper(): v for k, v in severity_query.all()}
    
    # Group incidents by type
    type_query = await db.execute(
        select(Incident.type, func.count(Incident.id))
        .group_by(Incident.type)
    )
    type_counts = {k.lower(): v for k, v in type_query.all()}
    
    return {
        "touristCount": tourist_count,
        "activeTrips": active_trips,
        "incidentsToday": total_incidents,
        "incidentsBySeverity": {
            "CRITICAL": severity_counts.get("CRITICAL", 0),
            "HIGH": severity_counts.get("HIGH", 0),
            "MODERATE": severity_counts.get("MODERATE", 0),
            "LOW": severity_counts.get("LOW", 0)
        },
        "incidentsByType": {
            "medical": type_counts.get("medical", 0),
            "police": type_counts.get("police", 0),
            "fire": type_counts.get("fire", 0),
            "anomaly": type_counts.get("anomaly", 0)
        },
        "averageResponseTimeSeconds": 0 # Real SLA calculation requires incident_events temporal joining
    }
