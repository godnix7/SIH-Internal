import logging
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger(__name__)

redis_client: redis.Redis | None = None

async def init_redis():
    global redis_client
    if not settings.REDIS_URL:
        logger.warning("REDIS_URL not set — running without Redis (rate limiting disabled)")
        return
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.warning(f"Redis unavailable — running without it: {e}")
        redis_client = None

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()

def get_redis() -> redis.Redis | None:
    return redis_client

