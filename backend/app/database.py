from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

engine_kwargs = {"echo": False, "future": True}
if "postgresql" in settings.async_database_url:
    engine_kwargs["pool_size"] = 50
    engine_kwargs["max_overflow"] = 20

engine = create_async_engine(
    settings.async_database_url,
    **engine_kwargs
)


# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db() -> AsyncSession:
    """
    Dependency for getting an async database session.
    Yields the session and ensures it is closed after the request.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
