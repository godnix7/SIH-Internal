import uuid
import hashlib
import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as redis
import logging
import time
from typing import Dict, Tuple

from app.database import get_db
from app.config import settings
from app.schemas.auth import RegisterRequest, RegisterResponse, VerifyOTPRequest, VerifyOTPResponse, RefreshRequest, RefreshResponse, InternalLoginRequest
from app.models.auth import User, Device, OTPAttempt, Session, InternalUser, InternalSession
from app.core.security import encrypt_pii, create_access_token
from passlib.context import CryptContext

from twilio.rest import Client

from app.core.redis import get_redis

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# In-memory OTP storage fallback when Redis is not available
# Format: { phone_hash: (otp_code, expires_at_timestamp) }
_OTP_CACHE: Dict[str, Tuple[str, float]] = {}

def _send_twilio_sms(phone: str, otp_code: str):
    try:
        sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        sender = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
        if sid and sid != "mock_sid" and token and sender:
            raw_phone = str(phone).strip()
            clean_digits = "".join(filter(str.isdigit, raw_phone))
            
            if raw_phone.startswith("+"):
                target_phone = raw_phone
            elif clean_digits.startswith("91") and len(clean_digits) == 12:
                target_phone = f"+{clean_digits}"
            elif len(clean_digits) == 10:
                target_phone = f"+91{clean_digits}"
            else:
                target_phone = f"+{clean_digits}"

            from_number = str(sender).replace(" ", "").strip()
            client = Client(sid, token)
            message = client.messages.create(
                body=f"Your Yatri Shield verification code is: {otp_code}",
                from_=from_number,
                to=target_phone
            )
            logger.info(f"Realtime SMS dispatched via Twilio to {target_phone} | Message SID: {message.sid}")
    except Exception as e:
        logger.error(f"Failed to dispatch SMS via Twilio to {phone}: {e}")

@router.post("/register", response_model=RegisterResponse)
async def register(request: RegisterRequest):
    clean_phone = "".join(filter(str.isdigit, request.phone)) if request.phone else request.phone
    phone_hash = hashlib.sha256(clean_phone.encode()).hexdigest()
    otp_code = str(random.randint(100000, 999999))
    masked_phone = f"******{clean_phone[-4:]}" if len(clean_phone) >= 4 else "******"

    logger.info(f"[AUTH REGISTER] Processing OTP request for {masked_phone} | Hash: {phone_hash[:10]}...")

    # Store in memory fallback (5-minute TTL)
    _OTP_CACHE[phone_hash] = (otp_code, time.time() + 300)
    
    # Store in Redis if connected
    try:
        redis_inst = get_redis()
        if redis_inst:
            await redis_inst.setex(f"otp:{phone_hash}", 300, otp_code)
            logger.info(f"[AUTH REGISTER] Saved OTP to Redis for {phone_hash[:10]}...")
    except Exception as e:
        logger.warning(f"[AUTH REGISTER] Redis store bypassed: {e}")

    # Dispatch SMS via Twilio if configured
    try:
        _send_twilio_sms(request.phone, otp_code)
    except Exception as e:
        logger.error(f"[AUTH REGISTER] SMS dispatch warning: {e}")

    logger.info(f"[AUTH REGISTER] Realtime OTP successfully generated for {masked_phone}")
    return RegisterResponse(otpSent=True, expiresInSec=300, method="sms")


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(request: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    try:
        clean_phone = "".join(filter(str.isdigit, request.phone)) if request.phone else request.phone
        phone_hash = hashlib.sha256(clean_phone.encode()).hexdigest()
        otp_key = f"otp:{phone_hash}"
        input_otp = str(request.otp).strip() if request.otp else ""
        masked_phone = f"******{clean_phone[-4:]}" if len(clean_phone) >= 4 else "******"
        is_valid = False

        logger.info(f"[AUTH VERIFY] Attempting verification for {masked_phone} | OTP len: {len(input_otp)}")

        # 1. Check Redis
        redis_inst = get_redis()
        if redis_inst:
            try:
                stored_otp = await redis_inst.get(otp_key)
                if stored_otp and str(stored_otp).strip() == input_otp:
                    is_valid = True
                    await redis_inst.delete(otp_key)
                    logger.info(f"[AUTH VERIFY] Redis match successful for {masked_phone}")
            except Exception as e:
                logger.warning(f"[AUTH VERIFY] Redis lookup warning: {e}")

        # 2. Check In-Memory Cache fallback
        if not is_valid and phone_hash in _OTP_CACHE:
            cached_otp, expires_at = _OTP_CACHE[phone_hash]
            if time.time() < expires_at and str(cached_otp).strip() == input_otp:
                is_valid = True
                del _OTP_CACHE[phone_hash]
                logger.info(f"[AUTH VERIFY] Memory cache match successful for {masked_phone}")
            elif time.time() >= expires_at:
                logger.warning(f"[AUTH VERIFY] Memory cache OTP expired for {masked_phone}")
                del _OTP_CACHE[phone_hash]

        if not is_valid:
            logger.warning(f"[AUTH VERIFY] Verification failed (INVALID_OTP) for {masked_phone}")
            raise HTTPException(status_code=401, detail="INVALID_OTP")
        
        # 3. Find or Create User
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
            logger.info(f"[AUTH VERIFY] Created new user record: {user.id}")
            
        # 4. Find or Create Device
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
        
        # 5. Token Generation & Session Storage
        access_token = create_access_token(subject=str(user.id), device_id=str(device.id), role=user.role)
        refresh_token = str(uuid.uuid4())
        
        refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        db_session = Session(
            user_id=user.id,
            device_id=device.id,
            refresh_token_hash=refresh_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=90)
        )
        db.add(db_session)
        await db.commit()

        logger.info(f"[AUTH VERIFY] Verification successful for user {user.id}")
        return VerifyOTPResponse(
            accessToken=access_token,
            refreshToken=refresh_token,
            sosToken=device.sos_token,
            userId=user.id,
            isNewUser=is_new_user,
            expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[AUTH VERIFY] Exception during verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
