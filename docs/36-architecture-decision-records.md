# Architecture Decision Records (ADR)

> **Document**: 36-architecture-decision-records.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: All Engineering  
> **Related**: [System Architecture](11-system-architecture.md)

---

## ADR-01: Modular Monolith over Microservices

- **Status**: Accepted
- **Context**: The team size is small. The domain (Incident Management) requires high transactional consistency between SOS alerts, incident state, and the outbox.
- **Decision**: We will build the backend as a Modular Monolith in FastAPI. Modules will have strict logical boundaries and communicate via a service layer or local events.
- **Consequences**: Easier deployment, simpler debugging, local transactions. We must enforce module boundaries via linting to prevent a "big ball of mud", preserving the ability to extract modules (like the Location Ingester) later.

## ADR-02: Client-side Geofencing Evaluation

- **Status**: Accepted
- **Context**: Checking GPS coordinates against thousands of complex polygons on the server for every tourist every 60 seconds is computationally expensive and raises privacy concerns.
- **Decision**: The server distributes "Zone Packs" (simplified polygons in Protobuf format). The mobile app evaluates GPS fixes against these polygons locally. The server only receives an alert if a Restricted/Disaster zone is breached.
- **Consequences**: Massive reduction in server compute and battery usage. Enhances privacy. Requires the client to handle the Ray-Casting algorithm and manage Zone Pack updates efficiently.

## ADR-03: Cryptographic Hash-chaining for Evidence

- **Status**: Accepted
- **Context**: The Bharatiya Sakshya Adhiniyam, 2023 requires stringent proof of non-tampering for electronic records to be admissible in court.
- **Decision**: We will implement a cryptographic hash-chain for all incident events, anchored periodically to a distributed Transparency Log or permissioned Blockchain (e.g., Hyperledger Besu) via Merkle Trees.
- **Consequences**: Guarantees mathematical non-repudiation. Adds complexity to the event ingestion pipeline. Requires a dedicated background worker to manage batch anchoring.

## ADR-04: Stateless JWTs with Redis Deny-List

- **Status**: Accepted
- **Context**: Every API call needs authentication. Hitting the database to verify a session for every location ping will crash the DB.
- **Decision**: Use short-lived (15 min) JWTs. To handle immediate revocations (e.g., a fired operator or a stolen phone), place the user ID in a Redis deny-list. The API gateway checks this list in O(1) time.
- **Consequences**: Highly scalable auth. Requires robust Refresh Token logic on the client side to silently get new access tokens every 15 minutes.

## ADR-05: Transactional Outbox Pattern

- **Status**: Accepted
- **Context**: When an SOS is saved to PostgreSQL, we must immediately notify the WebSockets (Redis), Push Notifications (FCM), and the Blockchain anchor worker. We cannot risk saving to the DB but failing to send the notification (or vice versa). Distributed transactions (2PC) are too slow.
- **Decision**: Use the Transactional Outbox pattern. The DB transaction writes the SOS record _and_ an event record to an `outbox` table simultaneously. A separate worker polls the outbox and publishes the events reliably to the Event Bus.
- **Consequences**: Guarantees At-Least-Once delivery. Consumers (WebSocket server, Notification worker) must be idempotent.

---

## References

- [System Architecture](11-system-architecture.md)
- [Geofencing Architecture](19-geofencing-architecture.md)
- [Blockchain Architecture](22-blockchain-architecture.md)
