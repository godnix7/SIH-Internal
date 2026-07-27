import uuid
import hashlib
import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as redis
import logging

from app.database import get_db
from app.config import settings
from app.schemas.auth import RegisterRequest, RegisterResponse, VerifyOTPRequest, VerifyOTPResponse, RefreshRequest, RefreshResponse, InternalLoginRequest
from app.models.auth import User, Device, OTPAttempt, Session, InternalUser, InternalSession
from app.core.security import encrypt_pii, create_access_token
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from app.core.redis import get_redis

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=RegisterResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    phone_hash = hashlib.sha256(request.phone.encode()).hexdigest()
    redis_inst = get_redis()
    
    if redis_inst:
        try:
            rate_key = f"rate:otp:{phone_hash}"
            requests_count = await redis_inst.incr(rate_key)
            if requests_count == 1:
                await redis_inst.expire(rate_key, 3600)
                
            if requests_count > 100:
                raise HTTPException(status_code=429, detail="Too many OTP requests. Try again later.")
                
            cooldown_key = f"cooldown:otp:{phone_hash}"
            if await redis_inst.exists(cooldown_key):
                raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another OTP.")
                
            await redis_inst.setex(cooldown_key, 60, "1")

            otp_code = str(random.randint(100000, 999999))
            otp_key = f"otp:{phone_hash}"
            await redis_inst.setex(otp_key, 300, otp_code)
        except Exception as e:
            logger.warning(f"Redis unavailable during register: {e}")
    
    # Send SMS (Mocked via console output — use test OTP '123456' for testing)
    print("\n" + "=" * 40)
    print(f"📱 SMS DISPATCH TO {request.phone}")
    print(f"🔑 Your Yatri Shield verification code is: 123456")
    print("=" * 40 + "\n")

    return RegisterResponse(otpSent=True, expiresInSec=300, method="sms")


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(request: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    phone_hash = hashlib.sha256(request.phone.encode()).hexdigest()
    otp_key = f"otp:{phone_hash}"
    
    # Universal test OTP '123456' for internal testing
    is_valid = (request.otp == "123456")
    
    redis_inst = get_redis()
    if not is_valid and redis_inst:
        try:
            stored_otp = await redis_inst.get(otp_key)
            if stored_otp and stored_otp == request.otp:
                is_valid = True
                await redis_inst.delete(otp_key)
        except Exception as e:
            logger.warning(f"Redis unavailable during verify: {e}")

    if not is_valid:
        raise HTTPException(status_code=401, detail="INVALID_OTP")
    
    # Find or create user
    result = await db.execute(select(User).where(User.phone_hash == phone_hash))
    user = result.scalars().first()
    is_new_user = False
    
    if not user:
        user = User(
            phone_hash=phone_hash,
            phone_enc=encrypt_pii(request.phone)
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        is_new_user = True
        
    # Find or create device
    result = await db.execute(
        select(Device)
        .where(Device.user_id == user.id)
        .where(Device.device_fingerprint == request.deviceFingerprint)
    )
    device = result.scalars().first()
    
    if not device:
        device = Device(
            user_id=user.id,
            device_fingerprint=request.deviceFingerprint,
            platform=request.platform,
            sos_token=str(uuid.uuid4())
        )
        db.add(device)
    else:
        device.last_seen_at = datetime.now(timezone.utc)
        
    await db.commit()
    await db.refresh(device)
    
    # Create tokens
    access_token = create_access_token(subject=str(user.id), device_id=str(device.id), role=user.role)
    refresh_token = str(uuid.uuid4())
    
    # Store refresh token session in DB
    refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_session = Session(
        user_id=user.id,
        device_id=device.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=90)
    )
    db.add(db_session)
    await db.commit()

    return VerifyOTPResponse(
        accessToken=access_token,
        refreshToken=refresh_token,
        sosToken=device.sos_token,
        userId=user.id,
        isNewUser=is_new_user,
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/login/internal", response_model=VerifyOTPResponse)
async def login_internal(request: InternalLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InternalUser).where(InternalUser.email == request.email))
    user = result.scalars().first()
    
    if not user or not pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")
        
    if user.status != "active":
        raise HTTPException(status_code=401, detail="ACCOUNT_SUSPENDED")
        
    # Create tokens (device_id is set to "web" since internal users don't have devices)
    access_token = create_access_token(subject=str(user.id), device_id="web", role=user.role)
    refresh_token = str(uuid.uuid4())
    
    # Store refresh token session in DB
    refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_session = InternalSession(
        internal_user_id=user.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=90)
    )
    db.add(db_session)
    await db.commit()

    return VerifyOTPResponse(
        accessToken=access_token,
        refreshToken=refresh_token,
        sosToken="",  # Internal users do not use SOS
        userId=user.id,
        isNewUser=False,
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    refresh_hash = hashlib.sha256(request.refreshToken.encode()).hexdigest()
    
    result = await db.execute(select(Session).where(Session.refresh_token_hash == refresh_hash))
    db_session = result.scalars().first()
    
    if not db_session or db_session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="REFRESH_TOKEN_EXPIRED")
        
    # Retrieve user to get role
    user_result = await db.execute(select(User).where(User.id == db_session.user_id))
    user = user_result.scalars().first()
    
    if not user or user.status != "active":
         raise HTTPException(status_code=401, detail="ACCOUNT_SUSPENDED")
         
    # Issue new tokens
    access_token = create_access_token(subject=str(user.id), device_id=str(db_session.device_id), role=user.role)
    new_refresh_token = str(uuid.uuid4())
    new_refresh_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
    
    # Update session (Rotate token)
    db_session.refresh_token_hash = new_refresh_hash
    db_session.expires_at = datetime.now(timezone.utc) + timedelta(days=90)
    await db.commit()
    
    return RefreshResponse(
        accessToken=access_token,
        refreshToken=new_refresh_token,
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
