# Implemented Features Report

This document serves as a living record of all features, APIs, and systems successfully implemented in the **Yatri Shield** project to date.

## 📱 Frontend (React Native / Expo App)

### 1. Navigation & Routing
- Expo Router file-based routing.
- Persistent Bottom Tab navigation (`Home`, `Shield`, `Alerts`, `Trips`, `Profile`).

### 2. Profile & Settings
- **Dynamic User Data**: The Profile screen fetches real-time data (name, phone, language preference, ID status) from the backend.
- **Authentication State Management**: Secure logout workflow that clears the token and redirects the user to the login screen.
- **Language Synchronization**: Changing language preferences in the app persists the change to the backend database.

### 3. Emergency Facilities
- **Dynamic Geolocation**: The Home screen queries the backend to display real emergency facilities (e.g., Police Stations) near the user's current GPS location, replacing static UI buttons.

---

## ⚙️ Backend (FastAPI + PostgreSQL/PostGIS)

### 1. Core Infrastructure
- **FastAPI**: Asynchronous REST framework.
- **PostgreSQL & PostGIS**: Geospatial database for tracking tourist locations, geofences, and facilities.
- **Redis**: Caching layer for high-throughput data.
- **Alembic**: Database schema migrations.
- **Docker Compose**: Containerized environment for local development.

### 2. User & Authentication API (`/api/v1/auth`, `/api/v1/users`)
- JWT-based authentication and secure endpoints via dependency injection.
- OTP verification stubs.
- Dynamic Profile fetching (`GET /users/me`) and modification (`PATCH /users/me`).

### 3. KYC & Identity (`/api/v1/identity`)
- **Digital ID Issuance**: `POST /identity/verify` mock implementation that consumes DigiLocker/Aadhaar or Passport MRZ tokens to issue a time-bound, cryptographically signed tourist credential.

### 4. Trip Management (`/api/v1/trips`)
- **Trip Lifecycle**: Creating drafts, starting trips, and ending trips.
- **Consent Tiers**: Full support for updating tracking consent tiers, backed by a cryptographic `ConsentReceipt` table for legal auditability.

### 5. Geospatial Facilities (`/api/v1/facilities`)
- **Nearby Query**: `GET /facilities/nearby` utilizes PostGIS functions (`ST_DWithin`) to find Police Stations and Emergency Contacts within a dynamic radius of the tourist's GPS coordinates.
- Seeded with functional test data.

### 6. Geofencing Zones
- Defined the PostGIS `Zone` schema (Advisory vs Restricted) for evaluating tourist locations against defined polygons.

### 7. Risk Engine (Phase 2)
- Database schemas (`TripRisk` and `RiskEvent`) created to support anomaly detection.
- Background anomaly triggers evaluate checking and geofence data to automatically raise SOS alerts when the tourist falls off the radar.

### 8. Dashboards & Ecosystem (Phase 3)
- **Live SOS Queue**: Next.js dashboard for the Police Control Room (`/responder`).
- **WebSockets**: Real-time Socket.IO integration instantly pushes SOS alerts and status changes to operators without polling.
- **SLA & Triage**: Visual alarms for SLA breaches (>60s) and "Covert/Silent" SOS modes.
- **Live Map**: React-Leaflet integration plots live emergency coordinates using OpenStreetMap tiles (privacy-preserving).
- **Incident Management**: Operators can acknowledge incidents, stopping the SLA timer and instantly notifying the tourist app that help is inbound.
- **Hospital Digital ID Scanner**: A Next.js webcam QR scanner (`/hospital`) that allows medical staff to scan a Tourist's ID.
- **Encrypted Medical Card**: Backend `/scan` API dynamically decrypts Medical Card and Emergency Contact databases for authorized hospital sessions, surfacing self-declared medical details.

### 9. Production-Ready Settings & Profile (Completeness Contract)
- **Unified Profile Header**: Displayed tourist info, profile status, and role in the React Native App.
- **Notifications Hub**: Settings screen to toggle Push Notifications and Trip Alerts.
- **Security & Sessions**: Users can view all active logged-in devices across platforms and remotely revoke them using `DELETE /me/sessions`.
- **Account Deletion (Right to be Forgotten)**: Destructive flow to permanently delete an account. The backend `DELETE /me` endpoint implements a soft-delete (anonymizes PII, clears all active sessions, and deletes medical/identity payload) while preserving the anonymized user UUID for legal holds.
- **Comprehensive UX**: Zero dead ends. All actions, including "Help & Support" and "Logout", are implemented with proper destructive dialog confirmations and secure token clearing.

### 10. Ecosystem Management (Phase 4)
- **Tourism Authority Dashboard (`/authority`)**: High-level operational view for Tourism Ministers to monitor real-time aggregates. Includes a module to broadcast safety advisories targeting specific regional zones.
- **System Admin Console (`/admin`)**: Technical dashboard for platform administrators to monitor internal users, role assignments, MFA enablement, database connection pool saturation, API latency (p95), and active socket connections.
- **Admin APIs**: `GET /api/v1/analytics/overview` and `GET /api/v1/system/health` implemented to securely surface ecosystem telemetry without exposing tourist PII.

### 11. Web Portal Authentication (Phase 4.1)
- **Staff Login Flow (`/login`)**: Built a secure OTP login page in the Next.js portal targeting internal staff.
- **Role-Based Routing & API Security**: Dashboards now read the JWT to parse the authenticated role (`operator`, `sys_admin`, etc.), dynamically hiding unauthorized sidebar links, and protecting API endpoints with the live `Bearer` token.
- **Admin Seeding Script**: Added `backend/scripts/seed_admin.py` to bypass mobile OTP registration when provisioning technical accounts for `sys_admin` personnel.

### 12. Blockchain Evidence Anchoring (Phase 5)
- **Cryptographic Event Chain**: Implemented `EventChain` to store chronological SHA-256 hashes for every incident event (Creation, Acknowledgement, Resolution, Cancellation). Ensures strict mathematical non-repudiation.
- **Merkle Batching Engine**: Created a background `anchor_batcher` that periodically collects terminal `chain_head` hashes of active incidents, constructs a Merkle Root, and anchors it to a transparency ledger table (`MerkleAnchor`).
- **Forensics API**: Added `GET /api/v1/blockchain/verify/{incident_id}` to allow digital auditors to cryptographically verify an incident's timeline integrity for court admissibility under BSA 2023.

### 13. Offline BLE Mesh Networking (Phase 5.2)
- **Peer-to-Peer Relays**: Integrated `react-native-ble-plx` in the mobile app. Created `MeshService` to broadcast compressed SOS beacons over Bluetooth Low Energy (BLE) when a tourist has zero cellular or SMS reception.
- **Background Scanning**: The app automatically scans for nearby Yatri Shield users in distress. If a beacon is detected and the relay user has internet, the app forwards the payload on their behalf.
- **Backend Ingest Route**: Implemented `POST /api/v1/sos/mesh-ingest` to receive and cryptographically verify relayed P2P signals, ensuring location coordinates and distress flags are logged accurately even from offline users.

### 14. Edge AI Incident Detection Engine (Phase 2)
- **Digital Signal Processing (DSP)**: Replaced legacy string-based risk rules with a real-time DSP pipeline running natively in React Native (`expo-sensors`). Buffers 50Hz Accelerometer/IMU data into 2.5s sliding windows to calculate Signal Magnitude Area (SMA) and peak G-force.
- **Contextual Confidence**: Edge AI models contextualize impacts. A high-G impact with an active screen reduces confidence (dropped phone), while an impact with an inactive screen spikes confidence (potential crash/fall).
- **Escalation State Machine**: 4-Level autonomous escalation. Level 1 (Passive), Level 2 (Increased GPS sampling), Level 3 (Silent Haptic Verification prompt in UI), Level 4 (Auto-SOS dispatch).
- **Backend Risk Vector Verification**: Rewrote `risk_engine.py` and exposed `POST /api/v1/risk/vector`. The backend evaluates the edge's `RiskVector` against cloud-side factors (e.g., restricted zones) and autonomously triggers a confirmed `EMERGENCY` dispatch if Critical Confidence is breached.

### 15. The AI Emergency Operator (NLP Voice Bot) (Phase 6)
- **Outbound Voice Calls**: When an SOS reaches Level 4, the system autonomously places outbound voice calls to emergency contacts, alongside sending encrypted SMS.
- **Twilio Webhooks Architecture**: Developed `POST /api/v1/voice/outbound/{incident_id}` and `POST /api/v1/voice/respond/{incident_id}` to handle TwiML `<Gather>` and `<Say>` telephony commands.
- **Dynamic NLP Generation**: Implemented `EmergencyVoiceBot` in `voice_ai.py` that ingests live incident context (location, severity, anomaly type) and generates conversational responses. Emergency contacts can literally speak to the AI and ask "Where exactly was she last seen?" and receive an automated NLP response derived from the live database.

### 16. Hardware Integrations (Apple Watch/Garmin) (Phase 7)
- **Universal BLE Architecture**: Built `wearableService.ts` utilizing `react-native-ble-plx` to natively scan, connect, and stream from any device broadcasting the standard Bluetooth SIG Heart Rate Service (`0x180D`).
- **Biological Corroboration**: The Edge AI (`aiEngine.ts`) buffers a rolling 30-second window of BPM. An impact correlated with a sudden heart rate spike (>120 BPM or rapid delta) applies a massive confidence multiplier (x1.8), effectively eliminating false positives from dropped phones.
- **Dynamic Risk Vector**: The telemetry payload dynamically attaches `heartRateBpm` and `vitalSpike` flags to the backend when a biological anomaly is detected during a crash.

### 17. Encrypted Offline SMS Fallback (Phase 8)
- **Zero-Data Outbox Dispatch**: Integrated `expo-sms` to dynamically route SOS payloads via SMS when the tourist's device loses 4G/5G data connectivity (e.g., deep inside a forest or mountain).
- **AES-256-CBC Payload Encryption**: Instead of sending plaintext coordinates over insecure telecom towers, the frontend generates a dynamic IV and encrypts the `[incident_id, lat, lon, acc, timestamp]` payload using `crypto-js` with a symmetric AES-256 key (`EXPO_PUBLIC_SMS_ENCRYPTION_KEY`).
- **Secure Backend Webhook**: The backend `POST /api/v1/sos/sms-ingest` webhook intercepts standard Twilio payload formats, parses the `YATRI_SOS_ENC` header, extracts the IV, and securely decrypts the ciphertext using standard `cryptography.hazmat` primitives, preserving tourist privacy against telecom-level interception.

### 18. Scalability & Feasibility Optimizations (Phase 9)
- **Database B-Tree Indices**: Added standard B-Tree indexing on all heavily queried PostgreSQL UUID columns (`trip_id`, `user_id`, `incident_id`, `status`) to prevent O(N) full table scans during simultaneous SOS surges in a regional rollout.
- **Async Connection Pool Bursting**: Scaled the SQLAlchemy AsyncEngine `pool_size` up to `50` (with `max_overflow=20`) to handle sudden spikes in database transactions without starving the Uvicorn workers.
- **Edge AI Memory Feasibility**: Eliminated the memory-leaking, CPU-thrashing O(N) `shift()` looping inside the 50Hz DSP array buffer (used by the accelerometer AI tracker). Replaced it with a high-performance `findIndex` + `splice` pattern, radically reducing JS garbage collection and extending the phone's battery life during active tracking.
- **Background Task Resilience**: Hardened the Twilio Voice AI dispatcher in `notification.py` by wrapping the `BackgroundTasks` in an asynchronous exponential backoff retry loop (up to 3 times). This guarantees that minor network/DNS blips do not silently drop automated emergency calls to the Police Control Room.

---

> **Note to Developers**: This file is actively maintained. Always update it when merging new feature phases from the `implementation_plan`.
