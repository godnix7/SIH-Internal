# Privacy Architecture (DPDP Act Compliance)

> **Document**: 26-privacy-architecture.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Legal, Compliance, Backend engineers  
> **Related**: [Database Architecture](14-database-architecture.md), [Authentication & Authorization](17-authentication-authorization.md)

---

## 1. Objective

Yatri Shield is designed from the ground up to comply strictly with the **Digital Personal Data Protection (DPDP) Act, 2023**. Privacy is not a bolt-on feature; it dictates the fundamental data models and monitoring architectures.

## 2. Core Principles

1. **Consent is Granular**: Users control exactly what data leaves their device.
2. **Consent is Dynamic**: Consent can be withdrawn or escalated at any time.
3. **Data Minimization**: The system only collects what is necessary for the stated purpose.
4. **Purpose Limitation**: Data collected for safety (SOS) cannot be used for tourism marketing.
5. **Right to Erasure**: Users can delete their accounts, subject to legal hold requirements.

## 3. The Consent Ledger

Every time a user alters their monitoring tier (e.g., from OFF to FULL MONITORING), the system generates a `ConsentReceipt`.

### 3.1 Receipt Contents

- Timestamp.
- The precise text of the privacy notice shown to the user.
- The specific tier selected.
- Device fingerprint.

This receipt is hashed and stored. If a user ever claims, "I didn't agree to be tracked," the platform can mathematically prove what was shown to the user and what they tapped.

## 4. Privacy by Design in Data Collection

| Feature              | Traditional Approach                                         | Yatri Shield Approach                                            | Privacy Benefit                                                              |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Analytics**        | Raw GPS dots on a map.                                       | H3 Hexagons with k-anonymity (suppress hexes with < 20 users).   | Impossible to track individual movement patterns on the aggregate dashboard. |
| **Geofencing**       | Server tracks user continuously to see if they enter a zone. | Server sends zone definitions to the app. App evaluates locally. | Server only knows location if a restricted zone is breached.                 |
| **SOS Medical Info** | Central unencrypted database.                                | Stored via Envelope Encryption.                                  | System DBAs cannot read medical data.                                        |

## 5. Right to Erasure & Legal Holds

Under the DPDP Act, users have the right to erase their data.
However, under the Bharatiya Nagarik Suraksha Sanhita (BNSS) and Bharatiya Sakshya Adhiniyam (BSA), evidence related to criminal investigations _must_ be preserved.

### 5.1 Deletion Protocol

1. User requests deletion via the Privacy Centre in the app.
2. System checks for Active Legal Holds (e.g., if the user was involved in an Incident that is still under police investigation).
3. **If NO hold**:
   - Row-level deletion of PII.
   - Cryptographic shredding (deletion of the Data Encryption Key, rendering the ciphertexts permanently unreadable).
4. **If YES hold**:
   - User is informed of the specific legal hold preventing deletion.
   - Non-relevant data (e.g., old trips not related to the incident) is shredded.

## 6. Audit Logging

Every access to PII by an Authority User (e.g., an Operator viewing an Incident) is logged.

- _Who_ accessed it.
- _When_ they accessed it.
- _What_ justification/purpose was provided (e.g., "Active SOS Incident #1234").

These logs are immutable and available for review by the Data Protection Officer (DPO).

---

## References

- [Trip Management](18-trip-management.md)
- [Database Architecture](14-database-architecture.md)
