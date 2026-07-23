import asyncio
import hashlib
import sys
import os

# Add the root directory to path to allow absolute imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy import select
from app.database import engine
from app.models.auth import InternalUser
from app.core.security import encrypt_pii

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)

async def seed_admin(email: str, password: str, role: str = "sys_admin"):
    """
    Creates or updates a user to the specified admin role.
    This bypasses OTP registration to easily provision initial staff.
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(password)
    
    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(InternalUser).where(InternalUser.email == email))
        user = result.scalars().first()
        
        if user:
            print(f"User {email} already exists (Current Role: {user.role}). Updating to {role} and resetting password...")
            user.role = role
            user.password_hash = hashed_password
        else:
            print(f"User {email} does not exist. Creating as {role}...")
            user = InternalUser(
                email=email,
                password_hash=hashed_password,
                role=role,
                status="active"
            )
            session.add(user)
            
        await session.commit()
        print(f"Success! You can now log into the Web Dashboard using {email}.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Seed an admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument("--role", default="sys_admin", choices=["operator", "hospital", "tourism_admin", "sys_admin"], help="The role to assign")
    
    args = parser.parse_args()
    
    asyncio.run(seed_admin(args.email, args.password, args.role))
