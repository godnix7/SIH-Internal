# Non-Functional Requirements

> **Document**: 04-non-functional-requirements.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Engineers, architects, DevOps, QA, security  
> **Related**: [Functional Requirements](03-functional-requirements.md) · [System Architecture](11-system-architecture.md) · [Security Architecture](27-security-architecture.md)

---

## 1. Performance Requirements

### 1.1 Latency

| Operation                                      | Target (p50) | Target (p95) | Target (p99) | Measurement                                   |
| ---------------------------------------------- | ------------ | ------------ | ------------ | --------------------------------------------- |
| SOS button press → dashboard card render       | ≤2 s         | ≤5 s         | ≤8 s         | Synthetic canary every 5 min + real telemetry |
| SOS acknowledgement → tourist app notification | ≤1 s         | ≤2 s         | ≤4 s         | Event timestamps                              |
| Location batch upload (7 points)               | ≤500 ms      | ≤1 s         | ≤2 s         | API response time                             |
| Zone pack download (initial, ~5 MB region)     | ≤3 s         | ≤8 s         | ≤15 s        | CDN response time                             |
| Geo-fence event server validation              | ≤200 ms      | ≤500 ms      | ≤1 s         | API response time                             |
| Risk engine evaluation                         | ≤100 ms      | ≤300 ms      | ≤500 ms      | Worker processing time                        |
| Dashboard incident list load                   | ≤500 ms      | ≤1 s         | ≤2 s         | Page load time                                |
| QR scan → medical card display (hospital)      | ≤1 s         | ≤2 s         | ≤3 s         | End-to-end scan-to-render                     |
| Blockchain verification (single incident)      | ≤2 s         | ≤5 s         | ≤10 s        | API response time                             |
| Check-in response (one-tap)                    | ≤300 ms      | ≤500 ms      | ≤1 s         | API response time                             |

### 1.2 Throughput

| Metric                             | Target                | Scale Basis                                             |
| ---------------------------------- | --------------------- | ------------------------------------------------------- |
| Concurrent active trips            | 50,000 per deployment | 1M registered users × 5% active                         |
| Location batches per second        | 1,000                 | 50k trips × 1 batch/7 min = ~120/s steady; 1k for burst |
| WebSocket connections (dashboard)  | 500                   | ~1 WS per 2k users                                      |
| SOS per minute (burst)             | 100                   | Mass-event scenario                                     |
| Notification dispatches per minute | 10,000                | SOS + contacts + advisories burst                       |

### 1.3 Mobile Performance

| Metric                                                 | Target                      | Measurement Method                                          |
| ------------------------------------------------------ | --------------------------- | ----------------------------------------------------------- |
| Battery drain — ACTIVE_TRIP mode                       | ≤3% per hour                | 60-min screen-off test on physical device, median of 3 runs |
| Battery drain — HIGH_RISK mode                         | ≤5% per hour                | Same methodology                                            |
| Battery drain — EMERGENCY mode                         | Uncapped (safety > battery) | Not measured as constraint                                  |
| Battery drain — LOW_BATTERY mode                       | ≤1% per hour                | Same methodology                                            |
| App cold start time                                    | ≤2 s                        | Time to interactive                                         |
| Zone pack evaluation (100 polygons, 200 vertices each) | ≤50 ms                      | On-device benchmark                                         |
| Offline queue size capacity                            | ≥10,000 events              | Queue storage test                                          |

---

## 2. Availability Requirements

| Component                                 | Availability Target | Allowable Downtime/Month | Justification                                             |
| ----------------------------------------- | ------------------- | ------------------------ | --------------------------------------------------------- |
| **SOS ingestion path** (API → DB → queue) | 99.95%              | ~22 minutes              | Emergency-grade; human lives depend on this               |
| **Authority dashboard**                   | 99.9%               | ~44 minutes              | Responders need continuous access during operations       |
| **Location ingestion**                    | 99.5%               | ~3.6 hours               | Batched and retried; temporary outage is recoverable      |
| **Notification delivery**                 | 99.9%               | ~44 minutes              | SOS notifications are life-safety; advisory less critical |
| **Blockchain anchoring**                  | 99.0%               | ~7.3 hours               | Asynchronous; queue absorbs outages; non-blocking         |
| **Analytics/tourism dashboard**           | 99.0%               | ~7.3 hours               | Non-critical path                                         |
| **Admin panel**                           | 99.0%               | ~7.3 hours               | Non-critical path                                         |

### Availability Architecture Implications

- SOS path must have an isolated resource pool (separate connection pool, dedicated worker threads) so that analytics load or blockchain outage cannot impact SOS
- No single point of failure on the SOS path: load balancer → ≥2 API replicas → primary DB with synchronous replica
- SOS works with expired JWT via dedicated device token — authentication outage must not block SOS

---

## 3. Scalability Requirements

### 3.1 Scaling Targets

| Phase               | Registered Users | Active Trips | Daily Location Points | Daily Incidents |
| ------------------- | ---------------- | ------------ | --------------------- | --------------- |
| MVP / Pilot         | 1,000            | 50           | 50,000                | 5               |
| v1.0 (single state) | 100,000          | 5,000        | 5,000,000             | 50              |
| v1.x (multi-state)  | 1,000,000        | 50,000       | 50,000,000            | 500             |
| v2.0 (national)     | 10,000,000       | 500,000      | 500,000,000           | 5,000           |

### 3.2 Scaling Strategy

| Scale Point   | Strategy                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------- |
| ≤100k users   | Single PostgreSQL + replicas, Redis, FastAPI horizontal replicas                              |
| 100k–1M users | Redis Streams → Kafka; Location-Ingest extracted as separate service; read replicas           |
| 1M–5M users   | Realtime/Notification extracted; Risk Workers scaled independently; per-state data partitions |
| >5M users     | Citus/sharding by state_id; multi-region deployment; CDN edge caching for zone packs          |

### 3.3 Scaling Levers (Ordered by Impact)

1. **Redis last-fix cache + CDN zone packs** — reads never hit PostgreSQL hot path
2. **Monthly partitions + BRIN indexes on time-series tables** — fast retention drops, efficient range queries
3. **Batch inserts (COPY) for location ingestion** — 10× throughput vs row-at-a-time
4. **Server-driven `nextSyncHintSec`** — global load-shedding by slowing client sampling during spikes
5. **Priority lanes in notification queue** — SOS notifications never starved by advisory batch
6. **Rate limits per device** — prevent runaway clients from overwhelming ingestion
7. **Horizontal API replicas** — stateless, behind load balancer

---

## 4. Reliability Requirements

### 4.1 Failure Tolerance

| Failure                           | System Behaviour                                                                               | Recovery                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Single API server crash           | Load balancer routes to remaining instances; no request loss for idempotent retries            | Auto-restart by orchestrator; ≤30s        |
| PostgreSQL primary failure        | Synchronous replica promoted; ≤30s failover                                                    | PITR from WAL if needed                   |
| Redis failure                     | Cache miss → PostgreSQL fallback; Streams rebuilt from outbox                                  | Auto-restart; warm cache in minutes       |
| Kafka broker failure (production) | Other brokers serve partitions; consumer rebalance                                             | Auto-recovery                             |
| SMS gateway failure               | Email fallback → both down: retry queue with exponential backoff                               | Gateway health probe; circuit breaker     |
| Blockchain network unreachable    | Anchor queue (DLQ after retries); system fully functional; verify API reports "pending anchor" | Non-blocking; gap visible in verification |
| Complete network loss for tourist | Offline queue persists; SMS fallback attempted; server detects missed sync                     | Auto-sync on reconnect                    |
| App force-killed by OS            | BOOT_COMPLETED receiver restarts monitoring for active trips; WorkManager re-checker           | Automatic on next wake                    |

### 4.2 Data Durability

| Data Type           | Durability Target                  | Mechanism                                                |
| ------------------- | ---------------------------------- | -------------------------------------------------------- |
| SOS records         | Zero loss                          | WAL replication, encrypted local queue as backup         |
| Incident events     | Zero loss                          | Transactional outbox, WAL, blockchain anchor             |
| Location points     | Best-effort (late_sync acceptable) | Client retry with idempotency; partition-based retention |
| Evidence files      | Zero loss after confirmation       | S3 with object-lock and cross-region replication         |
| Audit logs          | Zero loss                          | Synchronous write; write failure → page operations       |
| Zone configurations | Zero loss                          | Versioned rows; soft delete only                         |
| User profiles       | Zero loss                          | Standard DB durability; backup                           |

### 4.3 Timeout and Retry Defaults

| Context                   | Timeout | Retry Strategy                       | Max Retries           |
| ------------------------- | ------- | ------------------------------------ | --------------------- |
| Client → API (SOS)        | 5 s     | Immediate retry + SMS fallback       | 3, then offline queue |
| Client → API (general)    | 10 s    | Exponential backoff with full jitter | 3                     |
| Service → Service         | 3 s     | Exponential backoff                  | 3                     |
| Event consumer processing | 30 s    | Retry from stream with backoff       | 5, then DLQ           |
| Blockchain submission     | 30 s    | Exponential backoff                  | 10, then DLQ          |
| SMS delivery              | 60 s    | Provider retry                       | 3                     |

### 4.4 Circuit Breaker Configuration

| Dependency         | Trip Threshold             | Reset Timeout |
| ------------------ | -------------------------- | ------------- |
| Database           | 50% error over 20 requests | 30 seconds    |
| Redis              | 50% error over 20 requests | 15 seconds    |
| SMS gateway        | 30% error over 10 requests | 60 seconds    |
| KYC/DigiLocker API | 30% error over 10 requests | 120 seconds   |
| Blockchain RPC     | 50% error over 10 requests | 60 seconds    |
| Translation API    | 50% error over 10 requests | 30 seconds    |

---

## 5. Security Requirements

Detailed in [Security Architecture](27-security-architecture.md). Summary targets:

| Requirement                | Target                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Encryption in transit**  | TLS 1.3 everywhere; mTLS service-to-service and partner links                                               |
| **Encryption at rest**     | AES-256-GCM disk encryption; field-level envelope encryption for PII (id_ref, contacts, medical) via KMS    |
| **Authentication**         | Phone-OTP for tourists; username + password + mandatory TOTP MFA for authority users                        |
| **Device verification**    | Play Integrity (Android) / App Attest (iOS) for production                                                  |
| **Session management**     | JWT access tokens: 15 min; refresh tokens: 30 days, rotating; SOS device token: long-lived, narrowly-scoped |
| **API protection**         | Rate limits per token + per IP; request-size caps; JSON schema validation; WAF rules                        |
| **Input validation**       | All inputs validated at API boundary; parameterised queries; no dynamic SQL                                 |
| **Secrets management**     | Vault/cloud secret manager; never committed to source control; rotation policies enforced                   |
| **Key rotation**           | Data keys: 90 days; signing/anchor keys: 1 year with overlap; JWT signing via JWKS rotation                 |
| **Penetration testing**    | Before production launch; annually thereafter                                                               |
| **Vulnerability scanning** | Automated in CI; dependency scanning on every build                                                         |

---

## 6. Privacy Requirements

Detailed in [Privacy Architecture](26-privacy-architecture.md). Summary targets:

| Requirement                           | Target                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **DPDP Act 2023 compliance**          | Full compliance by system launch (well before 13 May 2027 deadline)                                    |
| **Consent management**                | Itemised plain-language notices; consent receipts as first-class data; easy withdrawal                 |
| **Purpose limitation**                | Every data access requires declared purpose + incident grant; analytics use truncated coordinates only |
| **Data minimisation**                 | Adaptive sampling; accuracy-truncated coords for analytics (3 decimals ≈ 110 m); H3 cells with k≥20    |
| **Retention**                         | Defined per data type; partition-drop for bulk deletion; deletion certificates logged                  |
| **Right to erasure**                  | User-initiated deletion API; legal holds visible and transparent; completion within retention schedule |
| **Breach notification**               | ≤72 hours to Data Protection Board and affected individuals                                            |
| **Significant Data Fiduciary duties** | Annual DPIA, audit, algorithmic assessment, DPO appointment `[VERIFIED — DPDP Rules 2025]`             |
| **Children's data**                   | Verifiable parental consent; prohibition on tracking/monitoring per DPDP Rule 10                       |

---

## 7. Accessibility Requirements

| Requirement               | Standard                           | Target                                                                            |
| ------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| **Screen reader support** | WCAG 2.1 AA                        | All interactive elements labelled; SOS button has descriptive accessibility label |
| **Touch targets**         | WCAG 2.1 AA                        | Minimum 48dp × 48dp for all interactive elements                                  |
| **Color contrast**        | WCAG 2.1 AA                        | Minimum 4.5:1 for normal text; 3:1 for large text                                 |
| **Text scaling**          | Android/iOS accessibility settings | App respects system font size up to 200% without layout breakage                  |
| **Reduced motion**        | prefers-reduced-motion             | Animations disabled when system preference set                                    |
| **One-handed operation**  | Mobile best practice               | SOS button reachable with one hand in any orientation                             |
| **Keyboard navigation**   | WCAG 2.1 AA (dashboard)            | All dashboard interactions keyboard-accessible; visible focus indicators          |
| **Large text mode**       | iOS Dynamic Type, Android sp       | Critical information (SOS status, alerts) readable at maximum system text size    |
| **Colour-blind safe**     |                                    | Status indicators use shape + colour (not colour alone)                           |

---

## 8. Localization Requirements

| Requirement              | Target                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **MVP languages**        | English, Hindi                                                                                                          |
| **v1.0 languages**       | English, Hindi, Bengali, Tamil (or 2 NE languages given ministry sponsorship)                                           |
| **v2.0 languages**       | ≥8 Indian languages + top 5 foreign tourist languages                                                                   |
| **Translation quality**  | Human-reviewed for all SOS-path screens and legal notices; AI-assisted for advisory content with "auto-translated" flag |
| **RTL support**          | Not required for Indian languages; design for future LTR/RTL flexibility                                                |
| **Date/time formatting** | Locale-aware; always show timezone for cross-timezone trips                                                             |
| **Number formatting**    | Locale-aware (Indian numbering system option for domestic users)                                                        |
| **Emergency content**    | All SOS, incident, and alert content translated in all supported languages; no fallback to English for emergency text   |

---

## 9. Compatibility Requirements

### 9.1 Mobile

| Platform | Minimum Version      | Target Version      | Rationale                                                                             |
| -------- | -------------------- | ------------------- | ------------------------------------------------------------------------------------- |
| Android  | API 26 (Android 8.0) | API 35 (Android 15) | Covers ~95% of active devices; foreground service APIs stable from 26+                |
| iOS      | 16.0                 | 19.0                | Region monitoring, significant-change service, background modes all available from 16 |

### 9.2 Dashboard (Web)

| Browser | Minimum Version         |
| ------- | ----------------------- |
| Chrome  | Latest 2 major versions |
| Firefox | Latest 2 major versions |
| Safari  | Latest 2 major versions |
| Edge    | Latest 2 major versions |

### 9.3 Network

| Condition          | Behaviour                                                   |
| ------------------ | ----------------------------------------------------------- |
| 4G/LTE             | Full functionality                                          |
| 3G                 | Full functionality with increased batch intervals           |
| 2G/EDGE            | SOS and critical events only; location batches reduced      |
| WiFi               | Full functionality                                          |
| No network         | Offline mode — local queue, on-device fencing, SMS fallback |
| Satellite (future) | Treated as network restoration event                        |

---

## 10. Compliance Requirements

| Regulation                    | Applicability                             | Compliance Target                                        | Reference                                                  |
| ----------------------------- | ----------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| DPDP Act 2023 + Rules 2025    | All personal data processing              | Full compliance at launch                                | [Legal & Regulatory](37-legal-regulatory-compliance.md)    |
| Puttaswamy (Right to Privacy) | State processing of location data         | Proportionality demonstrated via consent tiers           | [Privacy Architecture](26-privacy-architecture.md)         |
| BSA 2023 (s.63)               | Evidence admissibility of digital records | Chain-of-custody design targets BSA compliance           | [Blockchain Architecture](22-blockchain-architecture.md)   |
| BNSS 2023                     | e-FIR, Zero FIR procedures                | e-FIR workflow maps to BNSS provisions                   | [SOS & Incident Management](23-sos-incident-management.md) |
| Aadhaar Act                   | KYC for domestic tourists                 | DigiLocker/offline XML (not direct biometric auth)       | [Authentication](17-authentication-authorization.md)       |
| IT Act 2000/2008 (residual)   | Cyber security, reasonable practices      | Compliance with reasonable security practices standards  | [Security Architecture](27-security-architecture.md)       |
| Disaster Management Act 2005  | Emergency zone powers                     | NDMA/SDMA/DM powers form legal basis for temporary zones | [Geofencing](19-geofencing-architecture.md)                |

---

## 11. Operational Requirements

| Requirement                  | Target                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Deployment frequency**     | ≥1 per week (CI/CD automated)                                                               |
| **Rollback time**            | ≤5 minutes (previous image + config version pin)                                            |
| **Zero-downtime deployment** | Blue-green for API; canary for risk engine config changes                                   |
| **Database migration**       | Expand-contract pattern; no breaking schema changes in single deploy                        |
| **Monitoring coverage**      | 100% of critical SLIs have alerts; PagerDuty integration                                    |
| **Log retention**            | Application logs: 90 days; audit logs: 7 years; incident data: per legal retention schedule |
| **Backup frequency**         | WAL archiving continuous (5-min RPO); nightly base backups; cross-region copy               |
| **Disaster recovery drills** | Quarterly; includes kill-primary-during-simulated-SOS                                       |
| **On-call rotation**         | 24/7 for production; ≤15 min response for P1 incidents                                      |

---

## References

- [Functional Requirements](03-functional-requirements.md)
- [System Architecture](11-system-architecture.md)
- [Security Architecture](27-security-architecture.md)
- [Privacy Architecture](26-privacy-architecture.md)
- [Deployment Architecture](29-deployment-architecture.md)
- [Monitoring & Observability](30-monitoring-observability.md)
- [Disaster Recovery](31-disaster-recovery.md)
- [Testing Strategy](32-testing-strategy.md)
