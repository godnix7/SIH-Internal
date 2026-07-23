from pydantic import BaseModel, Field
import uuid

class RegisterRequest(BaseModel):
    phone: str = Field(..., description="E.164 formatted phone number")
    countryCode: str = Field(default="IN")

class InternalLoginRequest(BaseModel):
    email: str
    password: str
    deviceFingerprint: str
    platform: str

class RegisterResponse(BaseModel):
    otpSent: bool
    expiresInSec: int
    method: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    deviceFingerprint: str
    platform: str

class VerifyOTPResponse(BaseModel):
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
