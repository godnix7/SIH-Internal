# Yatri Shield — Engineering Documentation Index

> **System**: Smart Tourist Safety Monitoring & Incident Response System  
> **Codename**: Yatri Shield  
> **Problem Statement**: SIH25002 — AI, Geo-Fencing, and Blockchain-based Digital ID  
> **Sponsoring Ministry**: Ministry of Development of North Eastern Region  
> **Documentation Date**: July 2026  
> **Documentation Version**: 1.0.0

---

## About This Documentation

This `/docs` directory contains the complete engineering documentation for Yatri Shield — a production-grade, government-scale tourist safety platform for India. These documents describe the **production system**, not a prototype or hackathon demo.

Every document is written to the standard that an experienced software engineer can implement the system **without making assumptions**. Where information from the source research was incomplete, the gap is identified as an explicit assumption rather than silently invented.

### Source Documents

This documentation expands upon two foundational research reports:

| Report                        | Scope                                                                                                                                                           | Date        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Domain Research Report        | Problem analysis, stakeholders, personas, user journeys, legal/regulatory, competitor analysis, gap analysis, feature recommendations, MVP definition           | 7 July 2026 |
| Technical Architecture Report | Feature decomposition, end-to-end workflows, mobile/backend/database/AI/blockchain architecture, security, privacy, offline, deployment, testing, ADRs, roadmap | 7 July 2026 |

### Evidence Labels Used Throughout

| Label               | Meaning                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| `[VERIFIED]`        | Confirmed against a government, statutory, or credible primary/secondary source |
| `[RESEARCH-BACKED]` | Consistent with published research or multiple credible reports                 |
| `[ASSUMPTION]`      | Reasonable working assumption; must be validated before product decisions       |
| `[RECOMMENDATION]`  | Author's judgment based on evidence                                             |
| `[OPEN QUESTION]`   | Cannot be resolved without stakeholder/legal/field validation                   |
| `[UNRESOLVED]`      | Technical or organisational dependency not yet settled                          |

---

## Reading Order

### For Product Managers & Stakeholders

1. [Product Vision](01-product-vision.md)
2. [Business Requirements](02-business-requirements.md)
3. [Stakeholder Analysis](05-stakeholder-analysis.md)
4. [User Personas](06-user-personas.md)
5. [User Journeys](07-user-journeys.md)
6. [Competitor Analysis](40-competitor-analysis.md)
7. [Implementation Roadmap](34-implementation-roadmap.md)

### For System Architects

1. [Product Vision](01-product-vision.md)
2. [Functional Requirements](03-functional-requirements.md)
3. [Non-Functional Requirements](04-non-functional-requirements.md)
4. [System Architecture](11-system-architecture.md)
5. [Architecture Decision Records](36-architecture-decision-records.md)
6. [Database Architecture](14-database-architecture.md)
7. [API Specification](15-api-specification.md)
8. All Core Subsystem documents (17–25)

### For Mobile Engineers

1. [Mobile Architecture](12-mobile-architecture.md)
2. [UI Specification — Mobile](08-ui-specification-mobile.md)
3. [Offline Synchronization](25-offline-synchronization.md)
4. [Geofencing Architecture](19-geofencing-architecture.md)
5. [Trip Management](18-trip-management.md)
6. [SOS & Incident Management](23-sos-incident-management.md)

### For Backend Engineers

1. [Backend Architecture](13-backend-architecture.md)
2. [API Specification](15-api-specification.md)
3. [Database Architecture](14-database-architecture.md)
4. [Real-Time Communication](16-realtime-communication.md)
5. [Authentication & Authorization](17-authentication-authorization.md)
6. [Risk Engine](21-risk-engine.md)
7. [Notification System](24-notification-system.md)

### For Security & Privacy Engineers

1. [Privacy Architecture](26-privacy-architecture.md)
2. [Security Architecture](27-security-architecture.md)
3. [Authentication & Authorization](17-authentication-authorization.md)
4. [Legal & Regulatory Compliance](37-legal-regulatory-compliance.md)
5. [Blockchain Architecture](22-blockchain-architecture.md)

### For DevOps & QA Engineers

1. [Deployment Architecture](29-deployment-architecture.md)
2. [Monitoring & Observability](30-monitoring-observability.md)
3. [Disaster Recovery](31-disaster-recovery.md)
4. [Testing Strategy](32-testing-strategy.md)
5. [Coding Standards](33-coding-standards.md)
6. [Release Checklist](35-release-checklist.md)

### For Legal & Compliance Officers

1. [Legal & Regulatory Compliance](37-legal-regulatory-compliance.md)
2. [Privacy Architecture](26-privacy-architecture.md)
3. [Assumptions Register](39-assumptions-register.md)

---

## Complete Document Catalogue

### Phase 1: Foundation

| #   | Document                                                         | Description                                                           |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| 00  | [Index](00-index.md)                                             | This document — master index and reading guide                        |
| 01  | [Product Vision](01-product-vision.md)                           | Problem statement, evidence base, why this system exists              |
| 02  | [Business Requirements](02-business-requirements.md)             | Stakeholder needs, government value, success metrics, KPIs            |
| 03  | [Functional Requirements](03-functional-requirements.md)         | Every feature with priority, acceptance criteria, dependencies        |
| 04  | [Non-Functional Requirements](04-non-functional-requirements.md) | Performance, availability, scalability, security, privacy, compliance |
| 05  | [Stakeholder Analysis](05-stakeholder-analysis.md)               | All stakeholders, power/interest mapping, governance ownership        |
| 06  | [User Personas](06-user-personas.md)                             | 9 detailed personas with goals, pain points, expectations             |

### Phase 2: User Experience & Workflows

| #   | Document                                                           | Description                                                |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| 07  | [User Journeys](07-user-journeys.md)                               | All 16 end-to-end user journeys with failure scenarios     |
| 08  | [UI Specification — Mobile](08-ui-specification-mobile.md)         | Every screen, button, state, animation for the tourist app |
| 09  | [UI Specification — Dashboards](09-ui-specification-dashboards.md) | Police, Hospital, Tourism, Admin dashboard specifications  |
| 10  | [Form Specifications](10-form-specifications.md)                   | Every form: fields, validation, errors, offline behaviour  |

### Phase 3: Architecture

| #   | Document                                                | Description                                                 |
| --- | ------------------------------------------------------- | ----------------------------------------------------------- |
| 11  | [System Architecture](11-system-architecture.md)        | High-level components, data flows, trust boundaries         |
| 12  | [Mobile Architecture](12-mobile-architecture.md)        | Background services, monitoring modes, OS constraints       |
| 13  | [Backend Architecture](13-backend-architecture.md)      | Modular monolith, module boundaries, event internals        |
| 14  | [Database Architecture](14-database-architecture.md)    | All tables, ER diagram, partitioning, encryption, retention |
| 15  | [API Specification](15-api-specification.md)            | All ~60 endpoints with full contract details                |
| 16  | [Real-Time Communication](16-realtime-communication.md) | WebSocket design, heartbeat, reconnection, fallback         |

### Phase 4: Core Subsystems

| #   | Document                                                             | Description                                                   |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| 17  | [Authentication & Authorization](17-authentication-authorization.md) | OIDC, OTP, MFA, device attestation, RBAC+ABAC, break-glass    |
| 18  | [Trip Management](18-trip-management.md)                             | Trip lifecycle, consent tiers, monitoring modes, check-ins    |
| 19  | [Geofencing Architecture](19-geofencing-architecture.md)             | Hybrid device/server model, zone governance, GPS handling     |
| 20  | [AI Engine](20-ai-engine.md)                                         | Rules-first philosophy, translation, triage, auditability     |
| 21  | [Risk Engine](21-risk-engine.md)                                     | Scoring model, challenge state machine, factor weights        |
| 22  | [Blockchain Architecture](22-blockchain-architecture.md)             | Hash-chain, Merkle anchoring, consortium design, verification |
| 23  | [SOS & Incident Management](23-sos-incident-management.md)           | SOS types, incident lifecycle, dispatch, escalation, dedup    |
| 24  | [Notification System](24-notification-system.md)                     | Multi-channel delivery, templates, circuit breakers           |
| 25  | [Offline Synchronization](25-offline-synchronization.md)             | Store-and-forward, encrypted queue, conflict avoidance        |

### Phase 5: Cross-Cutting Concerns

| #   | Document                                             | Description                                                    |
| --- | ---------------------------------------------------- | -------------------------------------------------------------- |
| 26  | [Privacy Architecture](26-privacy-architecture.md)   | DPDP compliance, consent-as-data, retention, anti-surveillance |
| 27  | [Security Architecture](27-security-architecture.md) | Threat model, encryption, API protection, key management       |
| 28  | [Background Services](28-background-services.md)     | Workers, cron jobs, liveness watchdog                          |

### Phase 6: Operations & Quality

| #   | Document                                                     | Description                                           |
| --- | ------------------------------------------------------------ | ----------------------------------------------------- |
| 29  | [Deployment Architecture](29-deployment-architecture.md)     | MVP docker-compose, production Kubernetes, CI/CD      |
| 30  | [Monitoring & Observability](30-monitoring-observability.md) | Logging, metrics, tracing, SLIs/SLOs, alerting        |
| 31  | [Disaster Recovery](31-disaster-recovery.md)                 | RPO/RTO, backup, replication, failure matrix, drills  |
| 32  | [Testing Strategy](32-testing-strategy.md)                   | All test types, acceptance criteria, coverage targets |
| 33  | [Coding Standards](33-coding-standards.md)                   | Conventions, module boundaries, review checklist      |

### Phase 7: Governance & Roadmap

| #   | Document                                                             | Description                                                |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 34  | [Implementation Roadmap](34-implementation-roadmap.md)               | Phase timeline, milestones, dependencies, team allocation  |
| 35  | [Release Checklist](35-release-checklist.md)                         | Pre-release verification steps                             |
| 36  | [Architecture Decision Records](36-architecture-decision-records.md) | All 10 ADRs with full context and trade-offs               |
| 37  | [Legal & Regulatory Compliance](37-legal-regulatory-compliance.md)   | DPDP, BSA, BNSS, Aadhaar, foreigners regime, liability     |
| 38  | [Glossary](38-glossary.md)                                           | Every domain term and technical concept defined            |
| 39  | [Assumptions Register](39-assumptions-register.md)                   | All assumptions with validation status and impact          |
| 40  | [Competitor Analysis](40-competitor-analysis.md)                     | Government, international, private solutions, gap analysis |

---

## Cross-Reference Conventions

- Internal links use relative paths: `[Document Name](filename.md)`
- Section links use anchors: `[Section](filename.md#section-heading)`
- Evidence labels are carried forward from source reports and applied consistently
- Assumption IDs (A1–A10) are globally unique and tracked in [Assumptions Register](39-assumptions-register.md)
- ADR IDs (ADR-01 through ADR-10) are globally unique and expanded in [Architecture Decision Records](36-architecture-decision-records.md)
- Persona IDs (P1–P9) are defined in [User Personas](06-user-personas.md)
- Journey IDs (J1–J16) are defined in [User Journeys](07-user-journeys.md)
- Workflow IDs (W1–W16) are defined in [User Journeys](07-user-journeys.md) and cross-referenced in architecture documents

---

## Document Versioning

| Version | Date      | Changes                            |
| ------- | --------- | ---------------------------------- |
| 1.0.0   | July 2026 | Initial complete documentation set |

All documents in this set are at version 1.0.0 unless individually noted. Changes to individual documents should update their own version header and this index.
