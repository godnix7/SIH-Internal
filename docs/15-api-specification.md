# API Specification

> **Document**: 15-api-specification.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Frontend/backend engineers, QA  
> **Related**: [Backend Architecture](13-backend-architecture.md) · [Database Architecture](14-database-architecture.md) · [Authentication & Authorization](17-authentication-authorization.md)

---

## 1. API Conventions

### 1.1 Base URL

- MVP: `https://api.yatrshield.local/v1`
- Production: `https://api.yatrishield.gov.in/v1`

### 1.2 Authentication

All endpoints except `/auth/register`, `/auth/verify-otp`, and `/sos` (device-token) require a valid JWT Bearer token. Authority endpoints additionally require MFA-verified session.

### 1.3 Standard Headers

| Header             | Required            | Description                                        |
| ------------------ | ------------------- | -------------------------------------------------- |
| `Authorization`    | Yes (most)          | `Bearer <accessToken>`                             |
| `Content-Type`     | Yes (POST/PATCH)    | `application/json`                                 |
| `X-Device-Id`      | Recommended         | Device fingerprint for audit                       |
| `X-Correlation-Id` | Optional            | Trace ID (auto-generated if absent)                |
| `Idempotency-Key`  | Required (mutating) | UUID for dedup; stored 48h                         |
| `Accept-Language`  | Optional            | `en`, `hi` — affects error messages, notifications |

### 1.4 Pagination

Cursor-based pagination for all list endpoints:

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6...",
    "hasMore": true,
    "limit": 50
  }
}
```

Query params: `?limit=50&cursor=<opaque>`. Max limit: 100.

### 1.5 Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Location batch contains invalid data",
    "details": [{ "field": "points[1].accM", "issue": "non_positive" }],
    "requestId": "9f1c...",
    "retryable": false
  }
}
```

### 1.6 Rate Limits

| Scope                | Limit                          | Response                |
| -------------------- | ------------------------------ | ----------------------- |
| Per device (tourist) | 60 req/min general; SOS exempt | 429 + `retryAfterSec`   |
| Per IP (anonymous)   | 20 req/min                     | 429                     |
| Per user (authority) | 120 req/min                    | 429                     |
| Location batch       | 1 req/10s per device           | 429 + `nextSyncHintSec` |
| SOS                  | No rate limit                  | —                       |

---

## 2. Authentication Endpoints

### POST `/auth/register`

Register a new tourist account via phone number.

| Aspect             | Detail                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Auth**           | None                                                                                               |
| **Body**           | `{"phone": "+919876543210", "countryCode": "IN"}`                                                  |
| **Validation**     | phone: E.164 format, 7–15 digits                                                                   |
| **Business Logic** | Check existing account → generate 6-digit OTP → rate-limit OTP sends (3/hour) → queue SMS delivery |
| **Response (200)** | `{"otpSent": true, "expiresInSec": 300, "method": "sms"}`                                          |
| **Errors**         | 429 OTP_RATE_LIMITED: "Too many OTP requests. Try again in {retryAfterSec} seconds"                |

### POST `/auth/verify-otp`

Verify OTP and issue tokens.

| Aspect             | Detail                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | None                                                                                                                              |
| **Body**           | `{"phone": "+919876543210", "otp": "834291", "deviceFingerprint": "...", "platform": "android"}`                                  |
| **Validation**     | OTP: 6 digits; phone: E.164; deviceFingerprint: required                                                                          |
| **Business Logic** | Verify OTP (3 attempts max, then 5-min lockout) → create/find user → register device → generate SOS device token → issue JWT pair |
| **Response (200)** | `{"accessToken": "...", "refreshToken": "...", "sosToken": "...", "userId": "uuid", "isNewUser": true, "expiresIn": 900}`         |
| **Errors**         | 401 INVALID_OTP; 429 OTP_LOCKED                                                                                                   |

### POST `/auth/refresh`

Refresh access token using refresh token.

| Aspect             | Detail                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Auth**           | Refresh token in body                                                                |
| **Body**           | `{"refreshToken": "..."}`                                                            |
| **Business Logic** | Validate refresh token → rotate (issue new pair, invalidate old) → return new tokens |
| **Response (200)** | `{"accessToken": "...", "refreshToken": "...", "expiresIn": 900}`                    |
| **Errors**         | 401 REFRESH_TOKEN_EXPIRED; 401 REFRESH_TOKEN_REVOKED                                 |

### POST `/auth/authority/login`

Authority user login (username + password + TOTP).

| Aspect             | Detail                                                                              |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Auth**           | None                                                                                |
| **Body**           | `{"email": "...", "password": "...", "totpCode": "123456"}`                         |
| **Business Logic** | Verify credentials → verify TOTP → issue JWT with role claims → audit log           |
| **Response (200)** | `{"accessToken": "...", "refreshToken": "...", "user": {role, orgId, permissions}}` |
| **Errors**         | 401 INVALID_CREDENTIALS; 401 TOTP_REQUIRED; 403 ACCOUNT_SUSPENDED                   |

---

## 3. Identity & Profile Endpoints

### POST `/identity/verify`

Submit KYC verification (Aadhaar/passport).

| Aspect             | Detail                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | Bearer token (tourist)                                                                                                 |
| **Body**           | `{"type": "aadhaar", "digilockerToken": "..."}` or `{"type": "passport", "mrzData": "...", "photoBase64": "..."}`      |
| **Business Logic** | Validate KYC data → call DigiLocker/OCR service → create identity record → generate verifiable credential → set expiry |
| **Response (201)** | `{"identityId": "uuid", "confidence": "high", "credentialQR": "base64", "expiresAt": "ISO8601"}`                       |
| **Errors**         | 422 KYC_VERIFICATION_FAILED; 503 KYC_SERVICE_UNAVAILABLE (circuit breaker)                                             |

### GET `/users/me`

Get current user's profile.

### PATCH `/users/me`

Update profile fields.

### GET `/users/me/contacts`

List emergency contacts.

### POST `/users/me/contacts`

Add emergency contact. Body: `{name, phone, relationship, notifyTrip, notifyDailyOk}`.

### DELETE `/users/me/contacts/{contactId}`

Remove emergency contact.

### GET `/users/me/medical`

Get medical card.

### PATCH `/users/me/medical`

Update medical card fields. Body: `{bloodGroup, allergies, medications, conditions, ...}`.

### GET `/users/me/id`

Get Digital Tourist ID with QR credential.

---

## 4. Trip Endpoints

### POST `/trips`

Create a new trip.

| Aspect             | Detail                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | Bearer token (tourist)                                                                                                                             |
| **Body**           | `{"destination": "Shillong", "startDate": "2026-07-08", "endDate": "2026-07-12", "consentTier": "GEOFENCE_ALERTS", "checkinIntervalMinutes": 240}` |
| **Validation**     | startDate ≥ today; endDate ≥ startDate; endDate ≤ startDate + 90 days; consentTier: valid enum; checkinIntervalMinutes: 60–1440                    |
| **Business Logic** | Create trip (status=draft) → generate consent receipt → return trip with zone pack metadata                                                        |
| **Response (201)** | `{"tripId": "uuid", "status": "draft", "consentReceiptId": "uuid", "zonePack": {region, version, url, sha256}}`                                    |
| **Idempotency**    | Required                                                                                                                                           |

### POST `/trips/{tripId}/start`

Start trip monitoring.

| Aspect             | Detail                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | Bearer token (tourist, trip owner)                                                                                                                    |
| **Business Logic** | Validate trip is draft → set status=active, startedAt=now → generate consent receipt → return monitoring params                                       |
| **Response (200)** | `{"status": "active", "monitoringMode": "ACTIVE_TRIP", "modeParams": {gpsIntervalSec, syncIntervalSec}, "zonePack": {...}, "checkInSchedule": {...}}` |

### POST `/trips/{tripId}/pause` / POST `/trips/{tripId}/resume` / POST `/trips/{tripId}/end`

Trip lifecycle transitions.

### PATCH `/trips/{tripId}/consent`

Change consent tier mid-trip. Body: `{"consentTier": "FULL"}`.

### POST `/trips/{tripId}/checkin`

Record a check-in event. Body: `{"status": "ok", "location": {lat, lon, accM}, "battery": 72}`.

| Aspect             | Detail                                                 |
| ------------------ | ------------------------------------------------------ |
| **Response (200)** | `{"nextCheckinAt": "ISO8601", "tripStatus": "active"}` |

---

## 5. Location Endpoints

### POST `/locations/batch`

Upload a batch of location points.

| Aspect             | Detail                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | Bearer token (tourist)                                                                                                                                                                                  |
| **Headers**        | `Idempotency-Key: <batchUUID>`                                                                                                                                                                          |
| **Body**           | `{"tripId": "uuid", "points": [{"lat": 25.5735, "lon": 91.8820, "accM": 12.5, "altM": 1485, "speedMps": 1.2, "heading": 45, "battery": 72, "network": "4G", "source": "gps", "sampledAt": "ISO8601"}]}` |
| **Validation**     | ≤50 points per batch; monotonic timestamps; speed <250 km/h (teleport filter); accM >0; lat/lon in valid range                                                                                          |
| **Business Logic** | Validate → COPY bulk insert → update Redis last-fix cache → publish LocationUpdated event → return sync hint                                                                                            |
| **Response (200)** | `{"accepted": 7, "rejected": 0, "nextSyncHintSec": 420, "rejectReasons": []}`                                                                                                                           |
| **Errors**         | 429 BACKPRESSURE (nextSyncHintSec increased)                                                                                                                                                            |
| **Rate Limit**     | 1 batch per 10 seconds per device                                                                                                                                                                       |

### GET `/locations/trip/{tripId}`

Get location history for a trip. Auth: trip owner OR operator with active incident grant + declared purpose.

### GET `/locations/lastfix/{tripId}`

Get latest known location. Auth: same as above. Returns from Redis cache (≤1ms).

---

## 6. SOS Endpoints

### POST `/sos`

Trigger an SOS alert.

| Aspect             | Detail                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**           | SOS device token (not JWT — survives session expiry)                                                                                                                                 |
| **Headers**        | `Idempotency-Key: <clientSosId>`                                                                                                                                                     |
| **Body**           | `{"clientSosId": "uuid", "type": "police", "location": {lat, lon, accM, ts}, "battery": 18, "network": "EDGE", "note": "...", "covert": false, "tripId": "uuid"}`                    |
| **Business Logic** | BEGIN TX: validate → create SOSAlert → create Incident (severity from type+context) → create outbox events → COMMIT. Async: publish SOSTriggered, notify contacts, push to dashboard |
| **Response (202)** | `{"sosId": "uuid", "incidentId": "uuid", "status": "received", "ackSlaSec": 60}`                                                                                                     |
| **Idempotency**    | CRITICAL — client_sos_id is unique constraint; re-send returns stored response                                                                                                       |
| **Rate Limit**     | None — SOS is never rate-limited                                                                                                                                                     |

### POST `/sos/{sosId}/acknowledge`

Operator acknowledges SOS.

| Aspect             | Detail                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | Bearer token (operator/dispatcher/supervisor)                                                                                |
| **Body**           | `{"unitId": "uuid", "etaMinutes": 22}`                                                                                       |
| **Business Logic** | Validate SOS in received state → set status=acknowledged → create incident_event → hash-chain → outbox → push to tourist app |
| **Response (200)** | `{"status": "acknowledged", "acknowledgedBy": "operatorName", "ackLatencySec": 41}`                                          |

### POST `/sos/{sosId}/cancel`

Tourist cancels SOS after dispatch.

| Aspect             | Detail                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Auth**           | Bearer token (tourist, SOS owner)                                                                         |
| **Body**           | `{"reason": "false_alarm", "notes": "Accidental trigger"}`                                                |
| **Business Logic** | Validate PIN (app-side) → set SOS status=false_alarm → update incident → incident_event → notify operator |

### POST `/sos/sms-ingest`

Server-side webhook for SMS gateway. Parses SOS SMS format.

| Aspect             | Detail                                             |
| ------------------ | -------------------------------------------------- |
| **Auth**           | API key (SMS gateway → server; mTLS in production) |
| **Body**           | Raw SMS payload from gateway                       |
| **Business Logic** | Parse `SOS                                         | v1  | <UUID> | <lat> | <lon> | <acc> | <ts> | <idRef>` → create SOSAlert with source=sms → dedup by clientSosId against existing app-origin SOS |

---

## 7. Incident Endpoints

### GET `/incidents`

List incidents. Auth: operator (filtered by jurisdiction). Query params: status, severity, type, dateRange, cursor, limit.

### GET `/incidents/{incidentId}`

Get full incident detail including timeline. Auth: operator with jurisdiction match.

### POST `/incidents/{incidentId}/status`

Transition incident state.

| Aspect             | Detail                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | Bearer token (role-gated per transition)                                                                               |
| **Body**           | `{"toState": "assigned", "data": {"unitId": "uuid", "etaMinutes": 22}}`                                                |
| **Validation**     | State machine validates transition legality (see [SOS & Incident Management](23-sos-incident-management.md))           |
| **Business Logic** | Validate transition → update incident → create incident_event → hash-chain append → outbox → push to tourist/dashboard |
| **Errors**         | 409 ILLEGAL_TRANSITION                                                                                                 |

### POST `/incidents/{incidentId}/merge`

Merge duplicate incidents.

### POST `/incidents/{incidentId}/escalate`

Escalate to supervisor/SDRF.

### POST `/incidents/{incidentId}/close`

Close incident with disposition code and summary.

### GET `/incidents/{incidentId}/timeline`

Get complete incident event timeline with hash-chain verification status.

---

## 8. Geofence Endpoints

### POST `/geofences/zones`

Create a new zone. Auth: tourism_admin or sys_admin.

### GET `/geofences/zones`

List zones. Query params: class, status, region.

### PATCH `/geofences/zones/{zoneId}`

Update zone (creates new version).

### POST `/geofences/zones/{zoneId}/approve`

Approve a pending zone. Auth: role-gated by zone class.

### POST `/geofences/zones/{zoneId}/publish`

Publish an approved zone. Triggers zone pack rebuild and delta push.

### GET `/geofences/pack/{region}`

Download zone pack for a region. Returns signed protobuf. ETag-based caching.

### POST `/geofences/events`

Report a server-validated geofence event. Auth: Bearer (tourist). Body: `{zoneId, eventType, location, accuracy, dwellSec}`.

---

## 9. Blockchain / Verification Endpoints

### GET `/blockchain/verify/incident/{incidentId}`

Verify hash-chain integrity for an incident. Returns chain status and anchor proof.

| Response | Detail                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 200      | `{"chainLength": 12, "chainValid": true, "latestAnchor": {batchId, rootHash, txHash, blockNumber, confirmedAt}, "pendingEvents": 2}` |

### GET `/blockchain/verify/event/{eventId}`

Verify a single event's inclusion in the chain and Merkle tree.

### GET `/blockchain/verify/evidence/{evidenceId}`

Verify evidence hash integrity.

---

## 10. Notification Endpoints

### POST `/devices/push-token`

Register/update push token. Body: `{"pushToken": "...", "platform": "android"}`.

### GET `/notifications`

List notifications for current user. Paginated.

### PATCH `/notifications/{notificationId}/read`

Mark notification as read.

---

## 11. Admin Endpoints

### GET `/admin/config`

Get all config categories and current values.

### PATCH `/admin/config/{category}/{key}`

Update a config value. Creates new version. Auth: sys_admin.

### POST `/admin/config/{category}/rollback`

Rollback to a specific config version. Auth: sys_admin.

### GET `/admin/audit-log`

Search audit logs. Auth: auditor or sys_admin. Query: actor, action, resource, dateRange.

### GET `/admin/health`

System health check. Auth: sys_admin. Returns service statuses, queue depths, latencies.

### POST `/admin/organisations`

Create organisation. Auth: sys_admin.

### POST `/admin/users`

Create authority user. Auth: sys_admin. Body: `{email, name, role, orgId}`. No self-signup.

---

## 12. Medical / Hospital Endpoints

### GET `/medical/scan/{qrToken}`

Scan a tourist's QR and return medical card. Auth: hospital role + scoped incident grant.

| Aspect             | Detail                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Business Logic** | Validate QR token → check incident grant validity (TTL) → return medical card → log access (who, when, facility, incident) |
| **Response (200)** | `{"name": "...", "nameVerified": true, "bloodGroup": "B+", "bloodGroupVerified": false, "allergies": [...], ...}`          |
| **Audit**          | Every scan produces audit log entry                                                                                        |

---

## 13. Analytics Endpoints (Tourism Dashboard)

### GET `/analytics/density`

Tourist density by H3 cells. Auth: tourism_admin. Returns anonymised data with k≥20 suppression.

### GET `/analytics/incidents`

Incident summary by type, region, time. Auth: tourism_admin. Anonymised.

### GET `/analytics/response-times`

Average response times by district. Auth: tourism_admin.

---

## 14. OpenAPI Specification

The full OpenAPI 3.1 specification is auto-generated by FastAPI and available at `/docs` (Swagger UI) and `/openapi.json` in development environments. Production disables Swagger UI.

---

## References

- [Backend Architecture](13-backend-architecture.md)
- [Database Architecture](14-database-architecture.md)
- [Authentication & Authorization](17-authentication-authorization.md)
- [SOS & Incident Management](23-sos-incident-management.md)
- [Geofencing Architecture](19-geofencing-architecture.md)
