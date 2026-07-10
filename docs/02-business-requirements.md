# Business Requirements

> **Document**: 02-business-requirements.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Product managers, government stakeholders, programme sponsors  
> **Related**: [Product Vision](01-product-vision.md) · [Functional Requirements](03-functional-requirements.md) · [Stakeholder Analysis](05-stakeholder-analysis.md)

---

## 1. Business Objectives

### 1.1 Primary Objectives

| ID   | Objective                                          | Measurable Outcome                                                                                                           | Timeline          |
| ---- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| BO-1 | **Reduce tourist incident detection time**         | Time from distress onset to first responder awareness reduced from days to hours in remote areas, minutes in connected areas | Pilot + 12 months |
| BO-2 | **Provide location context for search and rescue** | Search area reduced by ≥80% compared to blind-search baseline for missing-tourist cases                                      | Pilot + 6 months  |
| BO-3 | **Enable multi-agency incident coordination**      | Single shared incident timeline used by ≥2 agencies per incident (police + one other)                                        | Pilot + 6 months  |
| BO-4 | **Create trustworthy incident records**            | 100% of incidents produce a hash-chained, verifiable event log                                                               | System launch     |
| BO-5 | **Respect tourist privacy and consent**            | Full DPDP Act 2023 / Rules 2025 compliance; zero non-consensual tracking                                                     | System launch     |

### 1.2 Secondary Objectives

| ID    | Objective                                            | Measurable Outcome                                                                                 | Timeline          |
| ----- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------- |
| BO-6  | **Reduce reporting friction for tourists**           | In-app incident report completion time ≤10 minutes; multilingual support for ≥4 languages          | v1.0              |
| BO-7  | **Provide proactive safety advisories**              | ≥70% tourist advisory-read rate; advisory-acknowledgment KPI tracked and ≥40%                      | v1.0              |
| BO-8  | **Enable disaster-zone roll-call**                   | Ability to determine registered-tourist count inside a declared emergency polygon within 5 minutes | v1.x              |
| BO-9  | **Integrate with existing emergency infrastructure** | SOS ingested by at least one state PSAP (ERSS-112) as a verified external signal                   | v1.x              |
| BO-10 | **Protect state tourism brand**                      | Demonstrate reduced negative press incidents per tourist-visit volume                              | Pilot + 24 months |

---

## 2. Stakeholder Value Propositions

### 2.1 Tourist Value

| Value                            | Description                                                                                                      | Feature Mapping                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Faster help when it matters**  | SOS with verified identity and full context reaches responders in seconds, not after a confused phone call       | SOS, Digital ID, Emergency Medical Card      |
| **Family peace of mind**         | Opt-in trip sharing with emergency contacts; automatic "I'm fine" pings; automatic notification on incident      | Trip sharing, Check-in auto-ping             |
| **Proactive safety information** | Zone advisories in the tourist's language, specific to their location and time of day                            | Geo-fenced advisories, Multilingual alerts   |
| **Works when phones don't**      | Offline SOS queuing with SMS fallback; checkpoint-based monitoring for treks                                     | Offline queue, SMS SOS, Checkpoint check-ins |
| **No document carrying**         | Digital tourist ID with QR — verifiable credential replaces need to show physical passport/Aadhaar               | Digital Tourist ID                           |
| **Easy incident reporting**      | Structured multilingual report, stamped acknowledgement, status tracking even after leaving the state            | e-FIR, Incident reporting                    |
| **Privacy control**              | Choose monitoring level (off / check-ins / zone alerts / full); revoke at any time; advisory hits stay on-device | Consent tiers                                |

### 2.2 Government Value

| Agency                      | Value                                                                                                                                     | Feature Mapping                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **State Police**            | Verified-identity SOS triage above anonymous signals; pre-populated incident cards; reduced blind searches; auditability                  | SOS ingestion, Dashboard, Hash-chain     |
| **Tourism Department**      | Arrival analytics (anonymised); advisory push with read-receipts; tourism-brand protection metrics                                        | Analytics, Zone advisories, Broadcasting |
| **SDRF/NDRF**               | Pre-registered trekker manifests; checkpoint monitoring; hazard-polygon roll-call; terrain-aware last-fix data                            | Trek module, Disaster zones, Roll-call   |
| **Forest Department**       | Restricted-zone intrusion alerts; permit-linked alert suppression; visitor counts per reserve                                             | Restricted geo-fencing                   |
| **Hospitals**               | Emergency medical card via QR scan on patient arrival — name, age, blood group, allergies, emergency contact, insurer, with access logged | Hospital QR, Medical card                |
| **District Administration** | Disaster-zone tourist count; coordinated evacuation; ministerial dashboards                                                               | Roll-call, Authority dashboard           |

### 2.3 Societal Value

| Value                         | Mechanism                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| **Lives saved**               | Earlier detection → earlier rescue → lower mortality in remote incidents                    |
| **Justice served**            | Tamper-evident records → stronger evidence → better prosecution/defence                     |
| **Trust built**               | Transparent privacy controls → tourist confidence → destination willingness                 |
| **Tourism economy protected** | Fewer high-profile incidents, faster response → reduced negative press → sustained arrivals |

---

## 3. Success Metrics & KPIs

### 3.1 Core Safety Metrics

| KPI                               | Definition                                                                                                                   | Target                                                           | Measurement Method                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| **Time-to-Detection (TTD)**       | Time from distress onset (estimated) to first system awareness (SOS received, anomaly flagged, or missed-check-in escalated) | ≤2 hours for monitored trips; ≤30 minutes for connected-area SOS | Incident event timestamps           |
| **Time-to-Acknowledgement (TTA)** | Time from SOS receipt at dashboard to operator acknowledgement                                                               | ≤60 seconds for p95                                              | SOS → ack event delta               |
| **Time-to-Dispatch (TTD-R)**      | Time from SOS receipt to responder dispatch                                                                                  | ≤5 minutes for p95                                               | SOS → assigned event delta          |
| **Search-Box Reduction**          | Ratio of last-known-location accuracy radius to baseline "blind search" area                                                 | ≥80% area reduction                                              | Last-fix accuracy vs. district area |
| **SOS End-to-End Latency**        | Time from SOS button press to dashboard card render                                                                          | ≤5 seconds for p95                                               | Synthetic canary + real telemetry   |

### 3.2 Adoption Metrics

| KPI                           | Definition                                                       | Target                           | Measurement Method                        |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| **Registration Rate**         | % of tourists at pilot entry points who complete registration    | ≥30% `[ASSUMPTION A1]`           | Registration count / entry-point footfall |
| **Active Trip Rate**          | % of registered users with an active trip at any given time      | ≥5% of registered base           | Active trips / total registrations        |
| **Consent Tier Distribution** | Distribution across Off / Check-ins / Zone Alerts / Full         | Full ≤20%; Check-ins + Zone ≥50% | Consent receipt analytics                 |
| **App Retention (7-day)**     | % of registered users who have app installed after 7 days        | ≥60%                             | App analytics                             |
| **Monthly Active Users**      | Unique users with at least one trip or SOS interaction per month | Trajectory growth per quarter    | App analytics                             |

### 3.3 Operational Metrics

| KPI                                 | Definition                                                | Target                                        | Measurement Method                          |
| ----------------------------------- | --------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| **SOS False-Positive Rate**         | % of SOS alerts determined to be false alarm              | ≤15%                                          | false_alarm incidents / total SOS incidents |
| **Advisory Acknowledgement Rate**   | % of zone advisories acknowledged by user                 | ≥40%                                          | Ack events / advisory push events           |
| **Anomaly Challenge Response Rate** | % of "Are you OK?" challenges responded to within timeout | ≥85% (indicating good threshold tuning)       | Challenge events with response / total      |
| **Check-in Compliance Rate**        | % of scheduled check-ins completed on time                | ≥75% for monitored trips                      | Check-in events vs. schedule                |
| **Incident Resolution Time**        | Time from incident creation to closure                    | Tracking only (no target — context-dependent) | Incident lifecycle timestamps               |

### 3.4 System Reliability Metrics

| KPI                          | Definition                                          | Target                       | Measurement Method            |
| ---------------------------- | --------------------------------------------------- | ---------------------------- | ----------------------------- |
| **SOS Availability**         | Uptime of the SOS ingestion path                    | 99.95%                       | Synthetic canary + monitoring |
| **Dashboard Availability**   | Uptime of the authority dashboard                   | 99.9%                        | Monitoring                    |
| **Location Ingestion Lag**   | Delay between batch timestamp and server processing | ≤5 minutes for p95           | Batch ts vs. processed ts     |
| **Offline Queue Drain Time** | Time from network restoration to full queue sync    | ≤2 minutes for typical queue | Client telemetry              |
| **Blockchain Anchor Lag**    | Time from event to confirmed anchor                 | ≤15 minutes                  | Anchor event timestamps       |

### 3.5 Privacy & Compliance Metrics

| KPI                              | Definition                                                       | Target                                      | Measurement Method            |
| -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| **Consent Withdrawal Latency**   | Time from consent withdrawal to processing stop                  | ≤5 minutes                                  | Consent event → pipeline stop |
| **Data Deletion Compliance**     | % of deletion requests completed within retention schedule       | 100%                                        | Deletion audit log            |
| **Unauthorised Access Attempts** | Count of access attempts failing ABAC policy                     | 0 successful (detect and alert on attempts) | Audit log analysis            |
| **Break-Glass Usage**            | Count of break-glass access events per quarter                   | Trending downward; each reviewed            | Break-glass audit log         |
| **Breach Notification Latency**  | Time from breach detection to notification (Board + individuals) | ≤72 hours `[VERIFIED — DPDP requirement]`   | Incident response log         |

---

## 4. Business Rules

### 4.1 Safety Business Rules

| Rule ID | Rule                                                                                                                                       | Rationale                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| BR-S01  | The system must never automatically dispatch responders based solely on AI or rule output. A human operator must acknowledge and dispatch. | False-positive catastrophe destroys responder trust permanently. `[RECOMMENDATION]` |
| BR-S02  | SOS must work even when the user's JWT access token has expired. A dedicated long-lived SOS device token must persist.                     | Emergency access cannot depend on authentication session validity.                  |
| BR-S03  | An SOS that cannot reach the server must attempt SMS fallback and persist locally for sync on reconnect.                                   | Offline dead zones are exactly where SOS is most needed.                            |
| BR-S04  | The system must always display "Call 112" as the parallel emergency route. It must never claim to replace ERSS-112.                        | Legal liability and user safety — the system is additive, not primary.              |
| BR-S05  | Missed-check-in escalation must challenge the user first ("Are you OK?") before notifying anyone.                                          | Dead battery ≠ emergency. False positives at scale destroy the system.              |
| BR-S06  | Risk severity CRITICAL must never fire on stale or low-confidence data alone.                                                              | Sending SDRF to phantom GPS coordinates wastes lives.                               |
| BR-S07  | Silent SOS must suppress all local sounds, UI changes, and call-backs. Responders receive a COVERT flag.                                   | Victim may be under duress; audible notification endangers them.                    |

### 4.2 Privacy Business Rules

| Rule ID | Rule                                                                                                                           | Rationale                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| BR-P01  | Default monitoring tier must be the least invasive option (Check-ins Only, with Off at equal visual weight).                   | DPDP Act consent must be free, specific, informed, unconditional. Default to maximum is consent-capture.                                |
| BR-P02  | Advisory-zone hits must never leave the device.                                                                                | Advisory is for the tourist's benefit; uploading "tourist was near a crime hotspot" creates a surveillance record with no safety value. |
| BR-P03  | No cross-trip movement profiling. Location data exists only within a trip context and is deleted per retention schedule.       | Purpose limitation under DPDP.                                                                                                          |
| BR-P04  | Every location read by an authority must require a declared purpose, an active incident grant, and produce an audit log entry. | Prevents standing surveillance.                                                                                                         |
| BR-P05  | Consent withdrawal must immediately stop all location processing and start the retention clock for deletion.                   | DPDP Act right of withdrawal.                                                                                                           |
| BR-P06  | Digital Tourist ID must auto-expire at trip end date and not persist indefinitely.                                             | Time-bound credential minimises surveillance potential.                                                                                 |
| BR-P07  | Children's data processing requires verifiable parental consent and prohibits tracking/monitoring per DPDP Rule 10.            | `[VERIFIED — DPDP Rules 2025]`                                                                                                          |

### 4.3 Operational Business Rules

| Rule ID | Rule                                                                                                                                                              | Rationale                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| BR-O01  | Geo-fence zone authoring requires approval workflow (class-dependent approver) before publication. Temporary disaster zones require two-person emergency publish. | Bad zones destroy user trust faster than any technical failure.                                                        |
| BR-O02  | Zone advisories must use neutral phrasing ("stay-alert zone") and never label areas as "unsafe" with tourism-economy consequences.                                | `[OPEN QUESTION — will states accept publishing risk labels?]`                                                         |
| BR-O03  | Officer response timestamps visible on the dashboard must not be used punitively without accounting for ground reality (staffing, connectivity, terrain).         | Officer resistance will kill adoption if the system becomes a surveillance tool against responders. `[ASSUMPTION A10]` |
| BR-O04  | Repeat false SOS (≥3 in 30 days) triggers a human-review flag only — never automatic punitive action.                                                             | First-N tolerance prevents discouraging genuine emergencies.                                                           |
| BR-O05  | All dashboard actions produce an audit trail. Audit log write failures must page operations immediately.                                                          | Compliance — the audit trail is the compliance evidence.                                                               |

---

## 5. Constraints

### 5.1 Regulatory Constraints

| Constraint                                                   | Source                       | Impact                                                                                                                              |
| ------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| DPDP Act 2023 / Rules 2025 full compliance by 13 May 2027    | `[VERIFIED — MeitY Gazette]` | System must be DPDP-native from day one — itemised notices, consent managers, SDF duties, breach reporting                          |
| Puttaswamy proportionality test                              | `[VERIFIED precedent]`       | Any state-mandated tracking must be necessary, proportionate, least-intrusive — justifies consent tiers against mandatory enrolment |
| BSA 2023 (s.63 electronic records)                           | `[RESEARCH-BACKED]`          | Hash-chain/blockchain evidence must target BSA certificate regime for admissibility                                                 |
| BNSS 2023 (e-FIR, Zero FIR)                                  | `[RESEARCH-BACKED]`          | e-FIR filing must map to BNSS provisions and state police SOPs                                                                      |
| Aadhaar Act authentication regimes                           | `[RESEARCH-BACKED]`          | DigiLocker/offline XML for domestic KYC                                                                                             |
| ILP states (Arunachal, Mizoram, Nagaland, Manipur) + PAP/RAP | `[RESEARCH-BACKED]`          | Permit-aware geofencing is legally load-bearing given NE ministry sponsorship                                                       |

### 5.2 Technical Constraints

| Constraint                                                         | Impact                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Android OEM battery killers (Xiaomi/Oppo/Vivo/OnePlus)             | Background service reliability requires foreground-service + watchdog + user guidance |
| iOS prohibition on arbitrary background services                   | Reduced monitoring fidelity on iOS; must disclose honestly                            |
| iOS cannot send SMS programmatically                               | Offline SOS on iOS requires user-visible SMS composer with one tap                    |
| Satellite SOS availability in India is uncertain                   | `[UNRESOLVED]` — cannot depend on satellite for trek comms                            |
| ERSS-112 integration requires per-state MoU                        | `[OPEN QUESTION]` — mock it, design the seam, pursue in parallel                      |
| MeitY-empanelled Indian cloud hosting required for government data | `[ASSUMPTION]` — limits provider choice                                               |

### 5.3 Organisational Constraints

| Constraint                                                                                  | Impact                                                          |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| No agency has been confirmed as platform owner (tourism vs. police vs. SDMA vs. joint cell) | `[OPEN QUESTION — critical]` — shapes entire product governance |
| Blockchain consortium requires ≥3 agencies operating nodes                                  | `[UNRESOLVED]` — transparency-log fallback must ship in v1      |
| SMS DLT registration and shortcode acquisition has lead time                                | Must begin in parallel with development                         |
| Hotel/operator participation is voluntary                                                   | `[ASSUMPTION A6]` — adoption campaigning required               |

---

## 6. Scope Boundaries

### 6.1 In Scope

| Category                         | Items                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platforms**                    | Android mobile app (primary), iOS mobile app (best-effort), web dashboards (police, hospital, tourism, admin)                                                                               |
| **User roles**                   | Tourist, Police Operator, SDRF Responder, Hospital Staff, Tourism Admin, System Admin                                                                                                       |
| **Core capabilities**            | Registration, Digital ID, Trip management, Consent-tiered monitoring, Geo-fencing, SOS, Incident management, Offline operation, Notifications, Blockchain anchoring, Analytics (anonymised) |
| **Integrations (seam-designed)** | ERSS-112 PSAP ingestion, SACHET/CAP disaster alerts, CCTNS e-FIR, 108 ambulance medical handoff                                                                                             |
| **Geography**                    | India (NE region priority per sponsoring ministry), designed for multi-state operation                                                                                                      |

### 6.2 Out of Scope

| Category                                  | Reason                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| Independent dispatch/control room         | Would fragment ERSS response `[RECOMMENDATION — firm]`      |
| Facial recognition / CCTV tracking        | Legally fraught, trust-destroying, unnecessary              |
| Tourist safety scoring / person scoring   | Profiling hazard                                            |
| PII on blockchain                         | DPDP erasure conflict, honeypot                             |
| Automatic AI dispatch                     | False-positive catastrophe                                  |
| Mandatory enrolment                       | Consent collapse, adoption backlash                         |
| Fake-report auto-detection                | Silences genuine victims                                    |
| Continuous ambient audio/video monitoring | Surveillance beyond purpose                                 |
| Real-time ML model training               | No training data exists; rules deliver v1 value             |
| Wearable hardware development             | Partner/rent, don't build `[Future scope]`                  |
| Cross-border operation outside India      | National focus; embassies handled as notification endpoints |

---

## 7. Dependencies

### 7.1 External Dependencies

| Dependency                                | Owner                    | Status                           | Risk Level                                    |
| ----------------------------------------- | ------------------------ | -------------------------------- | --------------------------------------------- |
| State PSAP/ERSS-112 MoU for SOS ingestion | MHA / State Police       | `[OPEN QUESTION]`                | HIGH — core value proposition depends on this |
| SACHET/CAP alert feed access              | NDMA/DoT                 | `[RESEARCH-BACKED — exists]`     | MEDIUM — one-way consumption                  |
| SMS DLT registration and shortcode        | TRAI / Telecom providers | Not started                      | HIGH — lead time is weeks to months           |
| DigiLocker API access for KYC             | MeitY                    | `[RESEARCH-BACKED — API exists]` | LOW — standard integration                    |
| IMD weather feed for route closures       | IMD                      | `[RESEARCH-BACKED]`              | MEDIUM — API availability varies              |
| MeitY-empanelled cloud hosting            | Cloud provider           | `[ASSUMPTION]`                   | MEDIUM — provider selection needed            |

### 7.2 Internal Dependencies

| Dependency                          | Required By                  | Status                                             |
| ----------------------------------- | ---------------------------- | -------------------------------------------------- |
| Zone governance policy              | Geo-fencing launch           | Must be defined with government partners           |
| Incident liability framework        | Production launch            | Legal counsel required `[OPEN QUESTION]`           |
| Officer training materials          | Dashboard rollout            | Must be produced before pilot                      |
| Hindi/regional language review      | Production launch            | Human review of all translated strings             |
| OEM-specific battery guidance       | Android launch               | Testing on real Xiaomi/Oppo/Vivo hardware          |
| Consortium MoU for blockchain nodes | Decentralised-claim validity | `[UNRESOLVED]` — transparency-log ships regardless |

---

## References

- [Product Vision](01-product-vision.md)
- [Functional Requirements](03-functional-requirements.md)
- [Non-Functional Requirements](04-non-functional-requirements.md)
- [Stakeholder Analysis](05-stakeholder-analysis.md)
- [Legal & Regulatory Compliance](37-legal-regulatory-compliance.md)
- [Assumptions Register](39-assumptions-register.md)
- [Implementation Roadmap](34-implementation-roadmap.md)
