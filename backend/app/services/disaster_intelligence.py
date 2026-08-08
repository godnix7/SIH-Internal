import httpx
import xml.etree.ElementTree as ET
import logging
from typing import List, Dict, Any
from datetime import datetime
import json
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

class DisasterIntelligenceService:
    """
    Phase 9: Disaster Intelligence Service.
    Fetches authoritative data from GDACS (Global Disaster Alert and Coordination System)
    and caches it to prevent hitting rate limits (Phase 23 Cost Protection).
    """
    GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"
    CACHE_KEY = "disasters:gdacs:active"

    @classmethod
    async def fetch_active_disasters(cls) -> List[Dict[str, Any]]:
        redis = get_redis()
        if redis:
            cached = await redis.get(cls.CACHE_KEY)
            if cached:
                return json.loads(cached)

        disasters = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(cls.GDACS_RSS_URL, timeout=15.0)
                resp.raise_for_status()
                
                # Parse XML
                root = ET.fromstring(resp.content)
                # GDACS RSS structure: channel -> item
                for item in root.findall('./channel/item'):
                    # GDACS uses namespaces, e.g. <gdacs:severity>
                    ns = {'gdacs': 'http://www.gdacs.org'}
                    
                    title = item.find('title')
                    desc = item.find('description')
                    link = item.find('link')
                    pub_date = item.find('pubDate')
                    
                    # geo:Point -> geo:lat, geo:long
                    geo_ns = {'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#'}
                    lat_elem = item.find('geo:Point/geo:lat', geo_ns)
                    lon_elem = item.find('geo:Point/geo:long', geo_ns)
                    
                    event_type = item.find('gdacs:eventtype', ns)
                    severity = item.find('gdacs:severity', ns)
                    alert_level = item.find('gdacs:alertlevel', ns)

                    if title is not None and lat_elem is not None and lon_elem is not None:
                        disasters.append({
                            "id": link.text if link is not None else str(hash(title.text)),
                            "title": title.text,
                            "description": desc.text if desc is not None else "",
                            "date": pub_date.text if pub_date is not None else datetime.utcnow().isoformat(),
                            "type": event_type.text if event_type is not None else "UNKNOWN",
                            "severity": severity.text if severity is not None else "Low",
                            "alertLevel": alert_level.text if alert_level is not None else "Green",
                            "location": {
                                "lat": float(lat_elem.text),
                                "lon": float(lon_elem.text)
                            }
                        })
        except Exception as e:
            logger.error(f"Failed to fetch from GDACS: {e}")
            # Do not throw, return empty list or fallback to allow system to continue
            return []

        if redis and disasters:
            # Cache for 15 minutes
            await redis.setex(cls.CACHE_KEY, 900, json.dumps(disasters))

        return disasters
