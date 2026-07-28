import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import engine
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy import select
from app.models.auth import InternalUser

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(InternalUser))
        users = result.scalars().all()
        for u in users:
            print(f"Email: {u.email}, Role: {u.role}")

asyncio.run(check())
