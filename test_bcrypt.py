import sys
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    hash = pwd_context.hash("password123")
    print("Success:", hash)
except Exception as e:
    print("Error:", type(e), e)
