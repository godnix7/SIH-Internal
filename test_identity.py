import httpx
import json

base_url = "https://yatri-shield-api.onrender.com/api/v1"

# 1. Signup
signup_data = {
    "email": "test_identity_4@example.com",
    "phone": "9998887776",
    "password": "password123",
    "confirmPassword": "password123"
}
r1 = httpx.post(f"{base_url}/auth/signup", json=signup_data)
if r1.status_code != 200:
    print("Signup failed:", r1.status_code, r1.text)
    exit(1)

token = r1.json()["accessToken"]

# 2. Verify KYC
headers = {"Authorization": f"Bearer {token}"}
payload = {
    "type": "aadhaar",
    "digilockerToken": json.dumps({"name": "Test User", "dob": "1990-01-01"})
}
r2 = httpx.post(f"{base_url}/identity/verify", json=payload, headers=headers)
print("Verify status:", r2.status_code)
print("Verify response:", r2.text)
