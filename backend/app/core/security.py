import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import jwt
import bcrypt
from cryptography.fernet import Fernet
import os
from app.config import settings

# IMPORTANT: In production, ENCRYPTION_KEY_BASE64 MUST be set via environment/KMS.
# This stable fallback is for LOCAL DEV ONLY so encrypted data persists across restarts.
import base64, logging as _logging
_sec_logger = _logging.getLogger(__name__)
_env_key = os.environ.get("ENCRYPTION_KEY_BASE64")
if _env_key:
    ENCRYPTION_KEY = _env_key
else:
    # Stable dev-only key (base64 of 32 zero bytes) — NEVER use in production
    ENCRYPTION_KEY = base64.urlsafe_b64encode(b'\x00' * 32).decode()
    _sec_logger.warning("ENCRYPTION_KEY_BASE64 not set! Using insecure dev fallback. SET THIS IN PRODUCTION.")
fernet = Fernet(ENCRYPTION_KEY)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def encrypt_pii(plaintext: str) -> bytes:
    """Encrypts PII like phone numbers using application-level encryption."""
    if not plaintext:
        return b""
    return fernet.encrypt(plaintext.encode("utf-8"))

def decrypt_pii(ciphertext: bytes) -> str:
    """Decrypts PII."""
    if not ciphertext:
        return ""
    return fernet.decrypt(ciphertext).decode("utf-8")

def create_access_token(subject: str, device_id: str, role: str = "tourist", expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": subject,
        "iss": "yatrishield-auth",
        "aud": "yatrishield-api",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "role": role,
        "deviceId": device_id,
        "acr": "1"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
