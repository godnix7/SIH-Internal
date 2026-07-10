# Authentication & Authorization

> **Document**: 17-authentication-authorization.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Backend engineers, security architects  
> **Related**: [System Architecture](11-system-architecture.md) · [Security Architecture](27-security-architecture.md) · [API Specification](15-api-specification.md)

---

## 1. Authentication (AuthN)

The system supports two distinct classes of users: Tourists (Mobile App) and Authorities (Dashboards). They have entirely different authentication flows.

### 1.1 Tourist Authentication (Passwordless OTP)

**Goal**: Zero friction for tourists, verifiable phone possession.

**Flow**:

1. User enters phone number (e.g., +91 9876543210).
2. Client posts to `/auth/register`.
3. Server generates 6-digit OTP, hashes it, stores in Redis with 5-minute TTL.
4. Server dispatches SMS via DLT-approved template.
5. User enters OTP.
6. Client posts to `/auth/verify-otp`.
7. Server validates OTP against Redis hash.
8. On success: Server creates/retrieves User, registers Device, and issues tokens.

**Token Issuance**:

- **Access Token**: Short-lived (15 minutes) JWT. Used for standard API calls.
- **Refresh Token**: Long-lived (90 days) opaque string stored in DB. Used to get new Access Tokens. Requires valid Device Fingerprint.
- **SOS Token**: Permanent (until device deregistered) opaque string. Restricted to `/sos` endpoint _only_. Allows SOS triggers even if the user hasn't opened the app in 6 months and their refresh token expired.

### 1.2 Authority Authentication (Credentials + MFA)

**Goal**: High security, strict non-repudiation, enterprise compliance.

**Flow**:

1. No self-registration. Sys Admins provision accounts.
2. Authority user enters email and password.
3. System verifies credentials.
4. System requires TOTP (Time-based One Time Password) code (e.g., Google Authenticator).
5. Upon successful MFA, issues Access Token and Refresh Token (12-hour TTL, requires daily login).

---

## 2. Token Architecture

### 2.1 JWT Access Token Structure

```json
{
  "alg": "ES256",
  "kid": "key-2026-07"
}
.
{
  "sub": "uuid-of-user",
  "iss": "yatrishield-auth",
  "aud": "yatrishield-api",
  "exp": 1784102400,
  "iat": 1784101500,
  "jti": "uuid-for-token",
  "role": "tourist",
  "orgId": null,
  "deviceId": "uuid-of-device",
  "acr": "1" // Authentication Context Class Reference (1=OTP, 2=MFA)
}
```

**Key Properties**:

- Signed using ECDSA (ES256) for smaller token size compared to RSA.
- Short expiration (15 mins) limits the window if a token is stolen.
- Includes `deviceId` to bind the token to a specific hardware session.

### 2.2 Token Revocation

Because Access Tokens are stateless and short-lived, we do not check a database for every API call.

- **Refresh Token Revocation**: Handled in the database. Deleting the refresh token prevents future access token issuance.
- **Immediate Access Revocation**: If an authority user is suspended or a tourist phone is reported stolen, we add the `user_id` or `jti` to a Redis "Deny List" which is checked by the auth middleware (extremely fast memory lookup).

---

## 3. Authorization (AuthZ)

We employ a hybrid approach: **Role-Based Access Control (RBAC)** for coarse-grained permissions, combined with **Attribute-Based Access Control (ABAC)** for fine-grained, context-aware decisions (e.g., "Can this operator see this specific tourist's location?").

### 3.1 Roles

| Role            | Scope  | Key Capabilities                                                       |
| --------------- | ------ | ---------------------------------------------------------------------- |
| `tourist`       | Self   | Manage own profile, create trips, trigger SOS, view own data.          |
| `operator`      | Org    | Acknowledge SOS, view incidents in their jurisdiction.                 |
| `dispatcher`    | Org    | Assign responder units, view incidents in jurisdiction.                |
| `supervisor`    | Org    | Override decisions, view org analytics, manage org users.              |
| `hospital`      | Org    | Scan Medical QR codes (read-only, time-limited).                       |
| `tourism_admin` | Global | View aggregate analytics, manage Advisory Zones, broadcast messages.   |
| `sys_admin`     | Global | Manage system configuration, create organisations, break-glass access. |
| `auditor`       | Global | Read-only access to Audit Logs and system reports.                     |

### 3.2 ABAC Policy Engine

Roles alone are insufficient. We must enforce privacy boundaries (DPDP Act).

**Example ABAC Scenarios enforced by the policy engine:**

1. **Location Access Rule**:
   - _Condition_: Role is `operator`.
   - _Attribute check_: Does the operator's `orgId` match the incident's `jurisdiction`?
   - _Attribute check_: Is the incident state active (not closed)?
   - _Result_: Allow if all true, Deny otherwise.

2. **Medical Card Access Rule**:
   - _Condition_: Role is `hospital`.
   - _Attribute check_: Was a valid QR code scanned?
   - _Attribute check_: Is the grant within the 24-hour TTL?
   - _Result_: Allow read-only access to the specific medical card.

### 3.3 The "Break-Glass" Protocol

In extreme emergencies where standard ABAC rules block necessary action (e.g., a tourist is missing outside an operator's normal jurisdiction), a supervisor or sys_admin can invoke "Break-Glass" access.

**Requirements for Break-Glass**:

- Hard prompt requiring a textual justification ("Reason for override").
- Generates a CRITICAL level Audit Log entry immediately.
- Sends an automated alert to the oversight committee (Auditors).
- Grants temporary (e.g., 2 hours) elevated access to the specific resource.

---

## 4. Middleware Implementation

The FastAPI middleware stack performs auth validation sequentially:

1. **Extract Token**: From `Authorization: Bearer <token>`.
2. **Signature & Expiry Check**: Validate JWT using public key.
3. **Deny List Check**: Fast Redis check `EXISTS deny:user:{sub}`.
4. **Attach Context**: Add parsed JWT claims to the `request.state.user` object.
5. **Route Execution**: Target endpoint is executed. Endpoint-level decorators (e.g., `@require_role("operator")`) perform the AuthZ checks before running business logic.

---

## References

- [Backend Architecture](13-backend-architecture.md)
- [Security Architecture](27-security-architecture.md)
- [Privacy Architecture](26-privacy-architecture.md)
