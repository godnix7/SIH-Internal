from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import logging
import httpx
from datetime import timedelta
import json
from app.config import settings

# In a real setup, you'd use a redis cache. We will mock the cache interface for now.
from app.core.redis import get_redis

router = APIRouter(prefix="/healthcare", tags=["healthcare"])
logger = logging.getLogger(__name__)

# Maps our types to Google Places types
TYPE_MAPPING = {
    "hospital": "hospital",
    "clinic": "doctor",
    "pharmacy": "pharmacy"
}

@router.get("/nearby")
async def get_nearby_healthcare(
    lat: float,
    lon: float,
    radius: int = Query(5000, le=10000), # Cap radius to 10km for cost/performance
    type: Optional[str] = None
):
    """
    Proxy to Google Places API to find nearby healthcare facilities.
    Implements aggressive caching (Cost Protection Phase 23).
    """
    if type and type not in TYPE_MAPPING:
        raise HTTPException(status_code=400, detail="Invalid healthcare facility type")
        
    google_type = TYPE_MAPPING[type] if type else "hospital"
    
    # Cost Protection: Quantize lat/lon to ~100m grid for better cache hit rates
    # 0.001 deg is ~111m
    q_lat = round(lat, 3)
    q_lon = round(lon, 3)
    cache_key = f"places:nearby:{google_type}:{q_lat}:{q_lon}:{radius}"
    
    redis = get_redis()
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return {"facilities": json.loads(cached), "source": "cache"}
            
    # Proxy to Google Places TextSearch or NearbySearch API
    # Using the New Places API (FieldMask is required to reduce cost)
    url = "https://places.googleapis.com/v1/places:searchNearby"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY, # Needs to be defined in settings
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.nationalPhoneNumber,places.regularOpeningHours,places.rating"
    }
    
    payload = {
        "includedTypes": [google_type],
        "maxResultCount": 10,
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": lat,
                    "longitude": lon
                },
                "radius": radius
            }
        }
    }
    
    facilities = []
    
    try:
        if not hasattr(settings, 'GOOGLE_MAPS_API_KEY') or not settings.GOOGLE_MAPS_API_KEY:
             # Fallback mock for development if no key
             logger.warning("No Google Maps API Key found, returning mock healthcare data.")
             facilities = [
                 {
                     "id": "mock_hospital_1",
                     "name": "District General Hospital",
                     "type": google_type,
                     "location": {"lat": lat + 0.01, "lon": lon + 0.01},
                     "address": "123 Health Ave",
                     "phone": "112",
                     "isOpen": True,
                     "rating": 4.5,
                     "distanceMeter": 1200
                 }
             ]
        else:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                
                places = data.get("places", [])
                for p in places:
                    facilities.append({
                        "id": p.get("id"),
                        "name": p.get("displayName", {}).get("text", "Unknown"),
                        "type": type or "hospital",
                        "location": {
                            "lat": p.get("location", {}).get("latitude"),
                            "lon": p.get("location", {}).get("longitude"),
                        },
                        "address": p.get("formattedAddress"),
                        "phone": p.get("nationalPhoneNumber"),
                        "isOpen": p.get("regularOpeningHours", {}).get("openNow"),
                        "rating": p.get("rating"),
                        # Note: We'd compute precise distance here or use Maps API distance matrix, 
                        # but straight-line is cheaper.
                    })
    except Exception as e:
        logger.error(f"Error fetching from Google Places: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch nearby facilities from provider")
        
    if redis:
        # Cache for 24 hours (facilities rarely move)
        await redis.setex(cache_key, 86400, json.dumps(facilities))
        
    return {"facilities": facilities, "source": "api"}

@router.get("/facility/{id}")
async def get_facility_details(id: str):
    """
    Fetch specific details (Cost protected via cache).
    """
    cache_key = f"places:detail:{id}"
    redis = get_redis()
    
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
            
    # Mock implementation for now
    details = {
        "id": id,
        "name": "District General Hospital",
        "type": "hospital",
        "location": {"lat": 0, "lon": 0},
        "address": "123 Health Ave",
        "phone": "112",
        "isOpen": True,
        "rating": 4.5
    }
    
    if redis:
        await redis.setex(cache_key, 86400, json.dumps(details))
        
    return details
