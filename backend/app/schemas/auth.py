from pydantic import BaseModel, Field, field_validator
import uuid
import re


class SignupRequest(BaseModel):
    email: str = Field(..., description="User email address")
    phone: str = Field(..., description="Phone number")
    password: str = Field(..., min_length=8, description="Password (min 8 chars)")
    confirmPassword: str = Field(..., description="Must match password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, v.strip()):
            raise ValueError("Invalid email address")
        return v.strip().lower()

    @field_validator("confirmPassword")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        password = info.data.get("password")
        if password and v != password:
            raise ValueError("Passwords do not match")
        return v


class SignupResponse(BaseModel):
    accessToken: str
    refreshToken: str
    sosToken: str
    userId: uuid.UUID
    expiresIn: int


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    deviceFingerprint: str = Field(default="device-unknown")
    platform: str = Field(default="android")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class LoginResponse(BaseModel):
    accessToken: str
    refreshToken: str
    sosToken: str
    userId: uuid.UUID
    isNewUser: bool
    expiresIn: int


class InternalLoginRequest(BaseModel):
    email: str
    password: str
    deviceFingerprint: str = Field(default="web-dashboard")
    platform: str = Field(default="web")


class InternalLoginResponse(BaseModel):
    accessToken: str
    refreshToken: str
    sosToken: str
    userId: uuid.UUID
    isNewUser: bool
    expiresIn: int


class RefreshRequest(BaseModel):
    refreshToken: str


class RefreshResponse(BaseModel):
    accessToken: str
    refreshToken: str
    expiresIn: int
