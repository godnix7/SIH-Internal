from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from datetime import datetime, timedelta
import logging

from app.database import AsyncSessionLocal
from app.models.trip import Trip
from app.services import risk_engine
from app.core.redis import get_redis
import json

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_device_silence():
    """
    Sweeps active trips and checks if they have been silent for > 30 minutes.
    Injects the DEVICE_SILENCE risk factor if they have.
    """
    logger.info("Running DEVICE_SILENCE sweeper job...")
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Trip).where(Trip.status == 'active'))
            active_trips = result.scalars().all()
            
            redis_client = get_redis()
            
            for trip in active_trips:
                # 1. Check Redis last_fix
                last_fix_time = None
                if redis_client:
                    data = await redis_client.get(f"lastfix:{trip.id}")
                    if data:
                        parsed = json.loads(data)
                        last_fix_time = datetime.fromisoformat(parsed['sampledAt'].replace('Z', '+00:00'))
                        # strip timezone info for simple comparison
                        last_fix_time = last_fix_time.replace(tzinfo=None)
                
                # 2. Check silence threshold
                if last_fix_time:
                    silence_duration = datetime.utcnow() - last_fix_time
                    if silence_duration > timedelta(minutes=30):
                        logger.warning(f"Trip {trip.id} silent for {silence_duration.total_seconds() / 60} minutes. Injecting DEVICE_SILENCE.")
                        await risk_engine.inject_risk_factor(db, trip.id, 'DEVICE_SILENCE')
            
            await db.commit()
    except Exception as e:
        logger.error(f"Error in sweeper job: {e}")

def start_scheduler():
    scheduler.add_job(check_device_silence, 'interval', minutes=5)
    scheduler.start()
    logger.info("APScheduler started with DEVICE_SILENCE sweeper.")
