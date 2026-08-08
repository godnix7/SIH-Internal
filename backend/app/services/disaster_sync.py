import uuid
from typing import List, Dict
import math
from geoalchemy2.shape import from_shape
from shapely.geometry import Point, Polygon
from app.models.zone import Zone
from app.services.disasters.base import DisasterSourceAdapter, DisasterEvent
from app.services.disasters.gdacs import GDACSAdapter
from app.services.disasters.usgs import USGSAdapter
from app.services.disasters.firms import FIRMSAdapter
from app.services.disasters.ndma import NDMAAdapter
from app.services.disasters.imd import IMDAdapter
import logging

logger = logging.getLogger(__name__)

class DisasterSyncService:
    @staticmethod
    def create_circle_polygon(lat: float, lon: float, radius_km: float, num_points: int = 32) -> Polygon:
        points = []
        for i in range(num_points):
            angle = math.pi * 2 * i / num_points
            dx = radius_km * math.cos(angle)
            dy = radius_km * math.sin(angle)
            dlon = dx / (111.320 * math.cos(math.radians(lat)))
            dlat = dy / 111.320
            points.append((lon + dlon, lat + dlat))
        return Polygon(points)

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    @classmethod
    async def sync_disasters_to_zones(cls, db) -> int:
        from sqlalchemy.future import select
        
        adapters: List[DisasterSourceAdapter] = [
            GDACSAdapter(),
            USGSAdapter(),
            FIRMSAdapter(),
            NDMAAdapter(),
            IMDAdapter()
        ]
        
        all_events: List[DisasterEvent] = []
        for adapter in adapters:
            try:
                events = await adapter.fetch_events()
                all_events.extend(events)
            except Exception as e:
                logger.warning(f"Adapter {adapter.source_name} sync skipped/failed: {e}")
                
        if not all_events:
            return 0
            
        # Refined Correlation Engine
        correlated_events: List[DisasterEvent] = []
        for event in all_events:
            matched = False
            for ce in correlated_events:
                # Rule 1: Same eventType is absolutely required
                # Rule 2: Geographically close (< 50km)
                # Rule 3: Must not merge USGS with FIRMS (already prevented by eventType, but good to be explicit)
                
                is_same_type = event.eventType.lower() == ce.eventType.lower()
                is_close = cls._haversine(event.latitude, event.longitude, ce.latitude, ce.longitude) < 50
                is_time_overlap = max(event.issuedAt, ce.issuedAt) < min(event.expiresAt, ce.expiresAt)
                
                # Check strong cross-source correlations
                valid_correlation = False
                if is_same_type and is_close and is_time_overlap:
                    # Allowed pairs for merging (to prevent false "single disaster" from unrelated events)
                    sources_set = {event.source, ce.source}
                    if sources_set <= {"USGS", "GDACS"}:
                        valid_correlation = True
                    elif sources_set <= {"IMD", "NDMA", "GDACS"}:
                        valid_correlation = True
                    elif sources_set <= {"FIRMS", "GDACS"} and event.eventType == "ACTIVE_FIRE":
                        valid_correlation = True
                    elif len(sources_set) == 1:
                        # Same source, same type, close proximity, time overlap -> could be duplicate detection or same storm
                        valid_correlation = True
                        
                if valid_correlation:
                    matched = True
                    # Increase corroboration score safely
                    ce.corroborationScore = min(1.0, ce.corroborationScore + 0.15)
                    ce.overallConfidence = min(1.0, ce.sourceConfidence + ce.corroborationScore)
                    
                    if not hasattr(ce, '_sources_list'):
                        ce._sources_list = [ce.source]
                    if event.source not in ce._sources_list:
                        ce._sources_list.append(event.source)
                    break
            
            if not matched:
                event._sources_list = [event.source]
                correlated_events.append(event)
            
        added_count = 0
        new_zones = []
        result = await db.execute(select(Zone).where(Zone.zone_class == 'disaster'))
        existing_zones = result.scalars().all()
        existing_names = {z.name for z in existing_zones}
        
        for event in correlated_events:
            zone_name = f"{event.source}: {event.title}"
            
            if zone_name in existing_names:
                continue 
                
            radius_km = 10.0
            if event.severity.lower() == 'orange':
                radius_km = 30.0
            elif event.severity.lower() == 'red':
                radius_km = 100.0
                
            poly = cls.create_circle_polygon(event.latitude, event.longitude, radius_km)
            
            new_zone = Zone(
                id=uuid.uuid4(),
                name=zone_name,
                zone_class='disaster',
                message=event.description[:255],
                geometry=from_shape(poly, srid=4326),
                geometry_source=event.geometrySource,
                safety_score=10, 
                risk_factors=[event.eventType, event.severity],
                expires_at=event.expiresAt,
                source_confidence=event.sourceConfidence,
                corroboration_score=event.corroborationScore,
                overall_confidence=event.overallConfidence,
                sources=getattr(event, '_sources_list', [event.source])
            )
            
            db.add(new_zone)
            new_zones.append(new_zone)
            added_count += 1
            
        if added_count > 0:
            await db.commit()
            logger.info(f"Disaster Sync: Added {added_count} new disaster zones.")
            # Hook for Phase 17B: Disaster Push Pipeline
            from app.services.notification_service import NotificationService
            await NotificationService.broadcast_disaster_sync(db, new_zones)
            
        return added_count
