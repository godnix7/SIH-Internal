import httpx
import logging
from typing import List
from datetime import datetime, timedelta
from app.services.disasters.base import DisasterSourceAdapter, DisasterEvent

logger = logging.getLogger(__name__)

class USGSAdapter(DisasterSourceAdapter):
    # Fetch 4.5+ magnitude earthquakes from the past 7 days
    USGS_GEOJSON_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson"

    @property
    def source_name(self) -> str:
        return "USGS"

    async def fetch_events(self) -> List[DisasterEvent]:
        disasters = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(self.USGS_GEOJSON_URL, timeout=15.0)
                resp.raise_for_status()
                
                data = resp.json()
                features = data.get('features', [])
                
                for feature in features:
                    props = feature.get('properties', {})
                    geom = feature.get('geometry', {})
                    
                    if not props or not geom or geom.get('type') != 'Point':
                        continue
                        
                    coords = geom.get('coordinates', [])
                    if len(coords) < 2:
                        continue
                        
                    lon, lat = coords[0], coords[1]
                    
                    mag = props.get('mag', 0)
                    title = props.get('title', 'Unknown Earthquake')
                    url = props.get('url', '')
                    time_ms = props.get('time')
                    updated_ms = props.get('updated')
                    event_id = feature.get('id', '')
                    
                    if not time_ms:
                        continue
                        
                    issued_at = datetime.fromtimestamp(time_ms / 1000.0)
                    updated_at = datetime.fromtimestamp(updated_ms / 1000.0) if updated_ms else issued_at
                    # Earthquakes are point-in-time but aftershocks/impacts last. Arbitrary 7 day expiry.
                    expires_at = issued_at + timedelta(days=7)
                    
                    # Determine severity based on magnitude
                    if mag >= 7.0:
                        severity = "Red"
                    elif mag >= 6.0:
                        severity = "Orange"
                    else:
                        severity = "Green"
                        
                    event = DisasterEvent(
                        id=f"usgs-{event_id}",
                        source=self.source_name,
                        sourceEventId=event_id,
                        eventType="EARTHQUAKE",
                        severity=severity,
                        title=title,
                        description=f"Magnitude {mag} earthquake detected by USGS.",
                        latitude=lat,
                        longitude=lon,
                        issuedAt=issued_at,
                        updatedAt=updated_at,
                        expiresAt=expires_at,
                        sourceUrl=url,
                        sourceConfidence=1.0, # Official source
                        overallConfidence=1.0,
                        lastVerifiedAt=datetime.utcnow(),
                        geometrySource='derived_approximation'
                    )
                    disasters.append(event)
        except Exception as e:
            logger.error(f"[USGS] Failed to fetch events: {e}")
            
        return disasters
