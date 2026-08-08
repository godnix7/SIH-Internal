import httpx
import xml.etree.ElementTree as ET
import logging
from typing import List
from datetime import datetime, timedelta
from dateutil import parser
from app.services.disasters.base import DisasterSourceAdapter, DisasterEvent

logger = logging.getLogger(__name__)

class GDACSAdapter(DisasterSourceAdapter):
    GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"

    @property
    def source_name(self) -> str:
        return "GDACS"

    async def fetch_events(self) -> List[DisasterEvent]:
        disasters = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(self.GDACS_RSS_URL, timeout=15.0)
                resp.raise_for_status()
                
                root = ET.fromstring(resp.content)
                for item in root.findall('./channel/item'):
                    ns = {'gdacs': 'http://www.gdacs.org'}
                    
                    title = item.find('title')
                    desc = item.find('description')
                    link = item.find('link')
                    pub_date = item.find('pubDate')
                    
                    geo_ns = {'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#'}
                    lat_elem = item.find('geo:Point/geo:lat', geo_ns)
                    lon_elem = item.find('geo:Point/geo:long', geo_ns)
                    
                    event_type = item.find('gdacs:eventtype', ns)
                    severity = item.find('gdacs:severity', ns)
                    alert_level = item.find('gdacs:alertlevel', ns)

                    if title is not None and lat_elem is not None and lon_elem is not None:
                        source_id = link.text if link is not None else str(hash(title.text))
                        
                        try:
                            parsed_date = parser.parse(pub_date.text) if pub_date is not None else datetime.utcnow()
                        except:
                            parsed_date = datetime.utcnow()
                            
                        # GDACS alerts are usually valid for 7 days
                        expires = parsed_date + timedelta(days=7)
                        
                        event = DisasterEvent(
                            id=f"gdacs-{source_id}",
                            source=self.source_name,
                            sourceEventId=source_id,
                            eventType=event_type.text if event_type is not None else "UNKNOWN",
                            severity=alert_level.text if alert_level is not None else "Green",
                            title=title.text,
                            description=desc.text if desc is not None else "",
                            latitude=float(lat_elem.text),
                            longitude=float(lon_elem.text),
                            issuedAt=parsed_date,
                            updatedAt=parsed_date,
                            expiresAt=expires,
                            sourceUrl=source_id,
                            sourceConfidence=1.0,
                            overallConfidence=1.0,
                            lastVerifiedAt=datetime.utcnow(),
                            geometrySource='derived_approximation'
                        )
                        disasters.append(event)
        except Exception as e:
            logger.error(f"[GDACS] Failed to fetch events: {e}")
            
        return disasters
