import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.database import get_db
from app.config import settings
from app.schemas.auth import (
    SignupRequest, SignupResponse,
    LoginRequest, LoginResponse,
    InternalLoginRequest, InternalLoginResponse,
    RefreshRequest, RefreshResponse,
)
from app.models.auth import User, Device, Session, InternalUser, InternalSession
from app.core.security import encrypt_pii, create_access_token, get_password_hash, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

async def check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60):
    from app.core.redis import get_redis
    redis_client = get_redis()
    if not redis_client:
        return
    
    current = await redis_client.incr(key)
    if current == 1:
        await redis_client.expire(key, window_seconds)
    
    if current > max_requests:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

@router.post("/signup", response_model=SignupResponse)
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Tourist signup with email, phone, password, confirmPassword."""
    await check_rate_limit(f"rate_limit:signup:{request.email}", max_requests=3, window_seconds=300)
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="EMAIL_ALREADY_EXISTS")

    # Hash phone for lookup index
    clean_phone = "".join(filter(str.isdigit, str(request.phone)))
    phone_hash = hashlib.sha256(clean_phone.encode()).hexdigest()

    # Create user
    hashed_password = get_password_hash(request.password)
    user = User(
        email=request.email,
        phone_hash=phone_hash,
        phone_enc=encrypt_pii(request.phone),
        password_hash=hashed_password,
        role="tourist",
        status="active",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"[AUTH SIGNUP] Created new tourist user: {user.id}")

    # Create device
    device = Device(
        user_id=user.id,
        device_fingerprint="signup-device",
        platform="android",
        sos_token=str(uuid.uuid4()),
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    # Generate tokens
    access_token = create_access_token(
        subject=str(user.id), device_id=str(device.id), role=user.role
    )
    refresh_token = str(uuid.uuid4())

    refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_session = Session(
        user_id=user.id,
        device_id=device.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=90),
    )
    db.add(db_session)
    await db.commit()

    return SignupResponse(
        accessToken=access_token,
        refreshToken=refresh_token,
        sosToken=device.sos_token,
        userId=user.id,
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Tourist login with email and password."""
    await check_rate_limit(f"rate_limit:login:{request.email}", max_requests=5, window_seconds=300)
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")

    if user.status != "active":
        raise HTTPException(status_code=401, detail="ACCOUNT_SUSPENDED")

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
            sos_token=str(uuid.uuid4()),
        )
        db.add(device)
    else:
        device.last_seen_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(device)

    # Generate tokens
    access_token = create_access_token(
        subject=str(user.id), device_id=str(device.id), role=user.role
    )
    refresh_token = str(uuid.uuid4())

    refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_session = Session(
        user_id=user.id,
        device_id=device.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=90),
    )
    db.add(db_session)
    await db.commit()

    logger.info(f"[AUTH LOGIN] Tourist login successful for user {user.id}")
    return LoginResponse(
        accessToken=access_token,
        refreshToken=refresh_token,
        sosToken=device.sos_token,
        userId=user.id,
        isNewUser=False,
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login/internal", response_model=InternalLoginResponse)
async def login_internal(request: InternalLoginRequest, db: AsyncSession = Depends(get_db)):
    """Internal user login for web dashboard (all staff roles)."""
    await check_rate_limit(f"rate_limit:login_internal:{request.email}", max_requests=5, window_seconds=300)
    result = await db.execute(select(InternalUser).where(InternalUser.email == request.email))
    user = result.scalars().first()

    if not user or not verify_password(request.password, user.password_hash):
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
        expires_at=datetime.now(timezone.utc) + timedelta(days=90),
    )
    db.add(db_session)
    await db.commit()

    return InternalLoginResponse(
        accessToken=access_token,
        refreshToken=refresh_token,
        sosToken="",  # Internal users do not use SOS
        userId=user.id,
        isNewUser=False,
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh an expired access token using a valid refresh token."""
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
    access_token = create_access_token(
        subject=str(user.id), device_id=str(db_session.device_id), role=user.role
    )
    new_refresh_token = str(uuid.uuid4())
    new_refresh_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()

    # Update session (Rotate token)
    db_session.refresh_token_hash = new_refresh_hash
    db_session.expires_at = datetime.now(timezone.utc) + timedelta(days=90)
    await db.commit()

    return RefreshResponse(
        accessToken=access_token,
        refreshToken=new_refresh_token,
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
