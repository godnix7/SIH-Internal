import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import os
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# DEV ONLY: A static dummy key for Fernet. In production, this should come from KMS or environment.
# Generating a valid fernet key string to use as default fallback.
_FALLBACK_FERNET_KEY = Fernet.generate_key()
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY_BASE64", _FALLBACK_FERNET_KEY)
fernet = Fernet(ENCRYPTION_KEY)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

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
