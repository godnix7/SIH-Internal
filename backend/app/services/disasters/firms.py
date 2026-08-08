import httpx
import logging
import os
import csv
import io
from typing import List
from datetime import datetime, timedelta
from app.services.disasters.base import DisasterSourceAdapter, DisasterEvent

logger = logging.getLogger(__name__)

class FIRMSAdapter(DisasterSourceAdapter):
    @property
    def source_name(self) -> str:
        return "FIRMS"

    async def fetch_events(self) -> List[DisasterEvent]:
        firms_key = os.getenv("FIRMS_MAP_KEY")
        if not firms_key:
            logger.warning("[FIRMS] FIRMS_MAP_KEY not set. Skipping FIRMS sync.")
            return []
            
        # Example using VIIRS SNPP NRT for the world, past 1 day
        # Source: https://firms.modaps.eosdis.nasa.gov/api/area/
        # URL: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/world/1
        # To avoid massive global data dumps, we could constrain by bounding box (e.g. India bounding box).
        # India bounding box roughly: 68.7, 8.4, 97.25, 37.6
        bbox = "68.7,8.4,97.25,37.6"
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{firms_key}/VIIRS_SNPP_NRT/{bbox}/1"
        
        disasters = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=15.0)
                resp.raise_for_status()
                
                # Parse CSV
                reader = csv.DictReader(io.StringIO(resp.text))
                
                for row in reader:
                    lat = float(row.get('latitude', 0))
                    lon = float(row.get('longitude', 0))
                    
                    # Confidence in VIIRS is 'n' (nominal), 'l' (low), 'h' (high)
                    conf_str = row.get('confidence', 'n').lower()
                    
                    if conf_str == 'h':
                        confidence_val = 0.8
                        severity = 'Orange'
                    elif conf_str == 'n':
                        confidence_val = 0.5
                        severity = 'Green'
                    else:
                        continue # Ignore low confidence fire detections to reduce noise
                        
                    acq_date = row.get('acq_date')
                    acq_time = row.get('acq_time') # Format HHMM
                    
                    try:
                        time_str = f"{acq_date} {acq_time[:2]}:{acq_time[2:]}:00"
                        issued_at = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
                    except:
                        issued_at = datetime.utcnow()
                        
                    # Fires move/expire fast. 2 days expiry.
                    expires_at = issued_at + timedelta(days=2)
                    
                    # Generate a reproducible ID based on lat/lon rounding and date to deduplicate within FIRMS
                    event_id = f"fire_{round(lat, 2)}_{round(lon, 2)}_{acq_date}"
                    
                    event = DisasterEvent(
                        id=f"firms-{event_id}",
                        source=self.source_name,
                        sourceEventId=event_id,
                        eventType="ACTIVE_FIRE",
                        severity=severity,
                        title="Active Fire Detection",
                        description=f"Satellite detected active fire thermal anomaly with {conf_str} confidence.",
                        latitude=lat,
                        longitude=lon,
                        issuedAt=issued_at,
                        updatedAt=issued_at,
                        expiresAt=expires_at,
                        sourceUrl="https://firms.modaps.eosdis.nasa.gov/",
                        sourceConfidence=confidence_val,
                        overallConfidence=confidence_val,
                        lastVerifiedAt=datetime.utcnow(),
                        geometrySource='derived_approximation'
                    )
                    disasters.append(event)
        except Exception as e:
            logger.error(f"[FIRMS] Failed to fetch events: {e}")
            
        return disasters
