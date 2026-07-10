# Risk Engine & Anomaly Detection

> **Document**: 20-risk-engine.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Backend engineers, Data scientists  
> **Related**: [Backend Architecture](13-backend-architecture.md), [Trip Management](18-trip-management.md), [Geofencing Architecture](19-geofencing-architecture.md)

---

## 1. Objective

The Risk Engine evaluates signals from tourists to automatically determine their safety status when explicit SOS isn't possible. It operates primarily on the principle of detecting _absence of expected behaviour_ (silence) or _presence of high-risk factors_.

## 2. Evaluation Triggers

The Risk Engine evaluates a Trip's state upon the following events:

- Ingestion of a new location batch.
- Receipt of a `GeoFenceEvent`.
- The `missed_checkin` background worker firing.
- The `liveness_watchdog` worker firing.

## 3. Risk Factors & Scoring

Risk is quantified on a scale from 0 to 100.

| Factor                    | Weight | Condition                                            |
| ------------------------- | ------ | ---------------------------------------------------- |
| **Missed Check-in**       | +80    | Timer expired without response.                      |
| **Disaster Zone Entry**   | +70    | Confirmed inside disaster zone.                      |
| **Restricted Zone Entry** | +40    | Confirmed inside restricted zone.                    |
| **Device Silence**        | +60    | No sync for > 2x expected sync interval (watchdog).  |
| **Battery Critical**      | +20    | Battery < 10% on last sync.                          |
| **Extreme Velocity**      | +30    | Unrealistic speed (e.g., > 150km/h on a trek route). |
| **Route Deviation**       | +30    | > 5km off declared trek corridor (if on FULL tier).  |

### 3.1 Decay and Accumulation

- Scores accumulate. (e.g., Restricted Zone (40) + Battery Critical (20) = 60).
- Scores decay over time if the condition resolves (e.g., exiting a zone drops the score).

## 4. The Challenge-Response Protocol

Yatri Shield avoids automatically dispatching police based purely on algorithms (which leads to false positives and alert fatigue). Instead, passing a risk threshold triggers a **Challenge**.

**Thresholds:**

- Score < 50: Normal monitoring.
- Score 50–74: Increased internal logging. Monitor closely.
- Score ≥ 75: **Initiate Challenge**.

### 4.1 Challenge Flow

1. Server transitions Trip `monitoring_mode` to `HIGH_RISK`.
2. Server dispatches high-priority FCM/APNs push to device: "Are you OK? Please respond."
3. **Timer starts** (e.g., 15 minutes).
4. **Outcome A (Success)**: User opens app, authenticates (biometrics/PIN), taps "I'm OK". Risk score reset.
5. **Outcome B (Failure/Silence)**: Timer expires.
6. Server automatically generates an **Anomaly SOS** (Severity: HIGH).
7. Incident is placed in the Operator Queue for human review.

## 5. Configuration

Factor weights and thresholds are controlled via the Admin Dashboard's Config Registry. Changes are versioned and take effect immediately without requiring service restarts.

---

## References

- [SOS & Incident Management](23-sos-incident-management.md)
- [Trip Management](18-trip-management.md)
