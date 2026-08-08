import httpx
import logging
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.auth import Device
from app.models.notification import NotificationHistory
from app.models.zone import Zone

logger = logging.getLogger(__name__)

class NotificationService:
    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

    @classmethod
    async def broadcast_disaster_sync(cls, db: AsyncSession, new_zones: List[Zone]):
        if not new_zones:
            return

        # Fetch all devices with push tokens
        # In a massive production system, we'd spatially query trips/locations here.
        # For MVP/Phase 17, we push to all active devices, and the device `locationEngine` decides if they are inside the zone.
        result = await db.execute(select(Device).where(Device.push_token.isnot(None)))
        devices = result.scalars().all()
        
        if not devices:
            logger.info("[NotificationService] No devices with push tokens found. Skipping broadcast.")
            return

        messages = []
        history_records = []
        
        for zone in new_zones:
            for device in devices:
                # Check history to prevent duplicates
                hist_check = await db.execute(
                    select(NotificationHistory)
                    .where(NotificationHistory.device_id == device.id)
                    .where(NotificationHistory.source_event_id == zone.name)
                )
                if hist_check.scalars().first():
                    continue # Already notified
                    
                messages.append({
                    "to": device.push_token,
                    "title": "🚨 SAFETY ALERT",
                    "body": f"Disaster warning: {zone.name}. Please open the app for details.",
                    "data": {
                        "type": "disaster",
                        "zone_id": str(zone.id)
                    },
                    "sound": "default",
                    "priority": "high"
                })
                
                history_records.append(
                    NotificationHistory(
                        device_id=device.id,
                        source_event_id=zone.name
                    )
                )

        if messages:
            try:
                # Expo supports batching up to 100 messages per request
                # We'll just send them all in one request for now (assuming <100 for this test)
                async with httpx.AsyncClient() as client:
                    resp = await client.post(cls.EXPO_PUSH_URL, json=messages)
                    resp.raise_for_status()
                    
                # Save history
                db.add_all(history_records)
                await db.commit()
                logger.info(f"[NotificationService] Sent {len(messages)} push notifications.")
            except Exception as e:
                logger.error(f"[NotificationService] Failed to send push notifications: {e}")
