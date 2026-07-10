# System Architecture

> **Document**: 11-system-architecture.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: System architects, senior engineers, DevOps  
> **Related**: [Backend Architecture](13-backend-architecture.md) · [Mobile Architecture](12-mobile-architecture.md) · [Database Architecture](14-database-architecture.md) · [Architecture Decision Records](36-architecture-decision-records.md)

---

## 1. Architecture Overview

### 1.1 Architectural Style

**Decision** `[REC]` (ADR-01): **Modular monolith** with strict module boundaries + transactional outbox + event-driven internals.

Rationale: consistency-critical incident core benefits from local transactions; team too small for distributed operations overhead; extraction path preserved. Full microservices from day one is rejected.

### 1.2 Component Diagram

```mermaid
graph TB
    subgraph "Client Zone"
        MA[Tourist Mobile App<br/>Flutter/React Native]
        WD[Authority Dashboard<br/>Next.js]
        HD[Hospital Dashboard<br/>Next.js]
    end

    subgraph "Edge"
        LB[Load Balancer<br/>Nginx/Cloud LB]
        CDN[CDN<br/>Zone Packs, Static]
        WAF[WAF<br/>Rate Limiting, DDoS]
    end

    subgraph "Application Zone"
        GW[API Gateway<br/>FastAPI]

        subgraph "Modular Monolith"
            AUTH[Auth Module]
            USER[User/Identity Module]
            TRIP[Trip/Consent Module]
            LOC[Location Module]
            GEO[Geofence Module]
            RISK[Risk Module]
            SOS[SOS Module]
            INC[Incident Module]
            EVD[Evidence Module]
            NOTI[Notification Module]
            BC[Blockchain Adapter]
            ADMIN[Admin Module]
        end

        WK[Worker Process<br/>Risk Cron, Outbox Relay,<br/>Anchor Batcher, Retention]

        RT[Realtime Server<br/>WebSocket/Socket.IO]
    end

    subgraph "Data Zone"
        PG[(PostgreSQL + PostGIS<br/>Primary + Replica)]
        RD[(Redis<br/>Cache, Streams, Pub/Sub)]
        S3[(S3-Compatible<br/>Object Storage)]
        KMS[KMS/Vault<br/>Key Management]
    end

    subgraph "Partner Zone (Semi-Trusted)"
        SMS[SMS Gateway<br/>DLT Registered]
        FCM[FCM/APNs<br/>Push Notifications]
        ERSS[ERSS-112 PSAP<br/>mTLS Integration]
        BESU[Besu Consortium<br/>2+ Nodes]
    end

    MA -->|HTTPS| WAF --> LB --> GW
    WD -->|HTTPS + WS| WAF --> LB --> RT
    HD -->|HTTPS| WAF --> LB --> GW
    MA -->|HTTPS| CDN

    GW --> AUTH & USER & TRIP & LOC & GEO & RISK & SOS & INC & EVD & NOTI & ADMIN
    GW --> RT

    AUTH & USER & TRIP & LOC & GEO & RISK & SOS & INC & EVD & NOTI --> PG
    AUTH & USER & TRIP & LOC & GEO & RISK & SOS & INC --> RD
    EVD --> S3
    AUTH --> KMS
    BC --> BESU

    WK --> PG & RD
    WK --> BC
    NOTI --> SMS & FCM

    SOS -.->|"Structured SOS<br/>ingestion"| ERSS
```

### 1.3 Component Responsibilities

| Component                | Responsibility                                                                               | Data Owned                            | Dependencies                     |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------- |
| **Auth Module**          | Registration, OTP, JWT issuance/refresh, device binding, MFA                                 | Sessions, devices, tokens             | KMS, SMS gateway, Redis          |
| **User/Identity Module** | Profile, KYC, Digital ID, medical card, emergency contacts                                   | Users, identity, medical              | DigiLocker API, KMS              |
| **Trip/Consent Module**  | Trip lifecycle, consent tiers, consent receipts, check-in scheduling                         | Trips, consent receipts               | User module                      |
| **Location Module**      | Batch ingestion, validation, storage, last-fix cache                                         | Location points                       | Redis (cache), PostGIS           |
| **Geofence Module**      | Zone CRUD, zone packs, server-side validation, pack distribution                             | Zones, geofence events                | PostGIS, CDN                     |
| **Risk Module**          | Rules evaluation, scoring, challenge orchestration, anomaly detection                        | Risk assessments                      | Location, Trip, Geofence modules |
| **SOS Module**           | SOS receipt, validation, incident creation, SMS ingestion                                    | SOS alerts                            | Incident module, Notification    |
| **Incident Module**      | Lifecycle state machine, dispatch, escalation, merge, evidence linking                       | Incidents, incident events            | All modules                      |
| **Evidence Module**      | Upload presigning, hash verification, storage                                                | Evidence metadata                     | S3, Blockchain adapter           |
| **Notification Module**  | Multi-channel dispatch, templates, delivery tracking                                         | Notifications, delivery status        | FCM, APNs, SMS gateway           |
| **Blockchain Adapter**   | Hash-chain, Merkle tree, batch anchoring, verification                                       | Blockchain anchors, chain data        | Besu/transparency log            |
| **Admin Module**         | Org management, config versioning, audit log, health                                         | Config versions, audit log            | All modules                      |
| **Realtime Server**      | WebSocket management, pub/sub relay, dashboard updates                                       | (stateless — relies on Redis pub/sub) | Redis pub/sub                    |
| **Worker Process**       | Background jobs: risk cron, outbox relay, anchor batcher, retention drops, liveness watchdog | (operates on other modules' data)     | PG, Redis, Blockchain            |

---

## 2. Data Flow Architecture

### 2.1 SOS Flow (Critical Path)

```mermaid
sequenceDiagram
    participant App as Tourist App
    participant LB as Load Balancer
    participant API as SOS Module
    participant DB as PostgreSQL
    participant OB as Outbox Relay
    participant RS as Redis Streams
    participant WS as Realtime (WS)
    participant Dash as Dashboard
    participant NT as Notification
    participant BC as Blockchain

    App->>LB: POST /sos (TLS 1.3, device-signed)
    LB->>API: Forward (idempotency check)
    API->>DB: BEGIN TX: INSERT sos_alert + incident + outbox_event
    DB->>API: COMMIT
    API->>App: 202 {sosId, incidentId}

    Note over OB: Outbox relay (≤100ms poll)
    OB->>DB: SELECT from outbox WHERE NOT relayed
    OB->>RS: Publish SOSTriggered + IncidentCreated
    OB->>DB: Mark relayed

    RS->>WS: SOSTriggered event
    WS->>Dash: WebSocket push (≤1s)

    RS->>NT: SOSTriggered event
    NT->>App: Push notification to emergency contacts
    NT->>NT: SMS to emergency contacts

    RS->>BC: IncidentCreated event
    BC->>BC: Append to hash chain
    BC->>BC: Queue for next Merkle batch
```

**Isolation guarantee**: The SOS path has its own connection pool, priority queue lane, and can function with only: LB → SOS module → PostgreSQL. All other dependencies (Redis, notifications, blockchain) are asynchronous and non-blocking.

### 2.2 Location Ingestion Flow

```mermaid
sequenceDiagram
    participant App as Tourist App
    participant API as Location Module
    participant DB as PostgreSQL (partitioned)
    participant RD as Redis
    participant RS as Redis Streams
    participant RK as Risk Module

    App->>API: POST /locations/batch {batchId, points[]}
    API->>API: Validate: monotonic ts, speed <250km/h, accuracy field present
    API->>DB: COPY (bulk insert) to location_point (monthly partition)
    API->>RD: SET trip:{id}:lastfix (latest point)
    API->>RS: Publish LocationUpdated (latest only, not every point)
    API->>App: 200 {accepted, rejected, nextSyncHintSec}

    RS->>RK: LocationUpdated
    RK->>RK: Evaluate risk factors
    RK->>RD: Check zone membership (cached)
    Note over RK: If score exceeds threshold → challenge flow
```

### 2.3 Event-Driven Internal Architecture

```mermaid
graph LR
    subgraph "Producers (via Transactional Outbox)"
        P1[SOS Module]
        P2[Incident Module]
        P3[Trip Module]
        P4[Location Module]
        P5[Geofence Module]
        P6[Risk Module]
    end

    subgraph "Event Bus"
        BUS[Redis Streams<br/>MVP<br/>─────<br/>Kafka<br/>Production]
    end

    subgraph "Consumers (Idempotent)"
        C1[Realtime/WS]
        C2[Notification]
        C3[Risk Engine]
        C4[Blockchain Adapter]
        C5[Analytics]
        C6[Audit Logger]
    end

    P1 & P2 & P3 & P4 & P5 & P6 --> BUS
    BUS --> C1 & C2 & C3 & C4 & C5 & C6
```

**Event envelope**: `{eventId (UUIDv7), type, version, occurredAt, correlationId, causationId, producer, payload}`

**Consumer idempotency**: Each consumer maintains a processed-events table (or Redis SETNX with 7-day TTL). Duplicate eventId → skip.

---

## 3. Trust Boundaries

```mermaid
graph TB
    subgraph "Untrusted Zone"
        PHONE[Tourist Phone]
        BROWSER[Authority Browser]
    end

    subgraph "Edge Zone (DMZ)"
        WAF2[WAF + DDoS]
        LB2[Load Balancer]
        CDN2[CDN]
    end

    subgraph "App Zone (Trusted)"
        API2[API Servers]
        WS2[WebSocket Servers]
        WK2[Workers]
    end

    subgraph "Data Zone (Most Trusted)"
        DB2[(PostgreSQL)]
        RD2[(Redis)]
        S32[(Object Store)]
        KMS2[KMS/HSM]
    end

    subgraph "Partner Zone (Semi-Trusted)"
        SMS2[SMS Gateway]
        ERSS2[ERSS-112]
        BESU2[Blockchain]
    end

    PHONE & BROWSER -->|"TLS 1.3<br/>JWT + Device Sig"| WAF2
    WAF2 --> LB2 --> API2 & WS2
    PHONE -->|"TLS 1.3"| CDN2
    API2 & WS2 & WK2 -->|"Private network"| DB2 & RD2 & S32
    API2 -->|"KMS API"| KMS2
    API2 & WK2 -->|"mTLS"| SMS2 & ERSS2 & BESU2
```

**Trust rules**:

1. Nothing in App Zone holds long-term keys (KMS manages)
2. Partner Zone is mutually-authenticated (mTLS) and semi-trusted — validate all inbound data
3. SMS-origin SOS gets `source=sms, unverified-channel` flag (lower verification than app-origin)
4. Data Zone reachable only from App Zone via security groups
5. CDN serves only signed, read-only zone packs (no write path)

---

## 4. Module Boundary Rules

| Rule                                                                                                      | Enforcement                       |
| --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Modules communicate via defined interfaces (service layer), never direct DB queries across module schemas | Code review + linting             |
| Cross-module data access uses events, not direct function calls                                           | Transactional outbox pattern      |
| Each module owns its database tables (separate schemas within same PostgreSQL instance)                   | Schema-per-module convention      |
| No circular dependencies between modules                                                                  | Dependency graph validation in CI |
| Shared types (event envelopes, error types, pagination) live in a common package                          | Shared kernel package             |

---

## 5. Scaling Architecture

### 5.1 MVP Architecture (Single VM)

```mermaid
graph TB
    subgraph "Single VM / docker-compose"
        NGINX[Nginx<br/>Reverse Proxy]
        API3[FastAPI<br/>Monolith]
        WORKER[Worker<br/>Process]
        PG3[(PostgreSQL<br/>+ PostGIS)]
        RD3[(Redis)]
        MINIO[(MinIO<br/>Object Store)]
        BESU3[Besu Node ×2]
        DASH3[Dashboard<br/>Static via Nginx]
    end

    PHONE2[Tourist Phone] -->|HTTPS| NGINX
    BROWSER2[Dashboard] -->|HTTPS + WS| NGINX
    NGINX --> API3 & DASH3
    API3 --> PG3 & RD3 & MINIO
    WORKER --> PG3 & RD3 & BESU3
```

### 5.2 Production Architecture

```mermaid
graph TB
    subgraph "Edge"
        CDN3[CDN]
        WAF3[WAF + DDoS]
        LB3[Load Balancer]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Core API (3+ replicas)"
            CORE[Core Service<br/>Auth, Users, Trips,<br/>Incident, SOS,<br/>Geofence Admin]
        end
        subgraph "Location Ingest (auto-scaled)"
            LOCI[Location Ingest<br/>Stateless, high-throughput]
        end
        subgraph "Realtime (sticky)"
            RTWS[Realtime + Notify<br/>WebSocket, Push, SMS]
        end
        subgraph "Risk Workers (scaled)"
            RSKW[Risk Workers<br/>Evaluation, Challenges]
        end
        subgraph "Blockchain Adapter"
            BCA[Anchor Batcher<br/>Hash Chain]
        end
    end

    subgraph "Data"
        PG4[(PostgreSQL HA<br/>Patroni, Replicas)]
        KAFKA[Kafka<br/>Event Bus]
        RD4[(Redis Cluster)]
        S34[(S3 + Object Lock)]
        VAULT[Vault/KMS/HSM]
    end

    CDN3 --> WAF3 --> LB3
    LB3 --> CORE & LOCI & RTWS
    CORE & LOCI & RSKW & BCA --> PG4 & KAFKA & RD4
    CORE & LOCI --> S34
    CORE --> VAULT
    BCA --> BESU4[Consortium Nodes ×3+]
```

### 5.3 Extraction Path (Modular Monolith → Services)

| Step | Trigger Metric                                                  | Extract                                                                  | Reason                                                                                                  |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 1    | Location writes > 1000/s sustained                              | **Location-Ingest** → separate service (Go candidate for raw throughput) | Write amplification; independent scaling; can use COPY-optimised path                                   |
| 2    | Dashboard WS connections > 500 or notification volume > 10k/min | **Realtime + Notification** → separate service                           | Connection-count scaling; independent failure domain                                                    |
| 3    | Risk evaluation latency > 500ms p95                             | **Risk Workers** → separate service                                      | CPU-bound; independent scaling                                                                          |
| 4    | Consortium node governance settled                              | **Blockchain Adapter** → separate service                                | Isolation from core; different deployment cadence                                                       |
| 5    | Never extract early                                             | **Incident/SOS Core**                                                    | Consistency heart; local transactions are the value; extraction adds distributed transaction complexity |

---

## 6. Cross-Cutting Architecture Patterns

### 6.1 Transactional Outbox

Every state-changing operation that produces an event writes both the state change AND the event row in the same database transaction:

```
BEGIN;
  INSERT INTO incidents (...) VALUES (...);
  INSERT INTO outbox_events (id, type, payload, created_at, relayed) VALUES (..., false);
COMMIT;
```

The outbox relay process polls `outbox_events WHERE relayed = false`, publishes to Redis Streams/Kafka, and marks `relayed = true`. This guarantees at-least-once delivery without distributed transactions.

### 6.2 Idempotency

Every mutating endpoint accepts an `Idempotency-Key` header. Server stores `(key, requestHash, response)` for 48 hours. Duplicate request with same key → return stored response. Mismatched body on same key → 422 IDEMPOTENCY_CONFLICT.

### 6.3 Correlation & Causation

Every request generates a `correlationId` (or inherits from `X-Correlation-Id` header). Events carry both `correlationId` and `causationId` (the eventId that triggered this event). All logs include `correlationId` for end-to-end tracing.

### 6.4 Graceful Degradation Ladder

Ordered from least to most severe:

1. **Lose analytics** → system fully operational for safety functions
2. **Lose blockchain anchoring** → incidents work, verification reports "pending"
3. **Lose advisory push notifications** → on-device fencing still works
4. **Lose family notifications** → SOS still reaches operators
5. **Never lose SOS intake** → isolated pool, minimal dependencies: LB → SOS module → PostgreSQL (or fallback log file)

---

## References

- [Backend Architecture](13-backend-architecture.md)
- [Mobile Architecture](12-mobile-architecture.md)
- [Database Architecture](14-database-architecture.md)
- [API Specification](15-api-specification.md)
- [Architecture Decision Records](36-architecture-decision-records.md)
- [Deployment Architecture](29-deployment-architecture.md)
- [Scalability (NFR)](04-non-functional-requirements.md#3-scalability-requirements)
