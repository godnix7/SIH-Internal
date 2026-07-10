# UI Specification — Authority Dashboards

> **Document**: 09-ui-specification-dashboards.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Frontend engineers, UX designers, QA  
> **Related**: [UI Specification — Mobile](08-ui-specification-mobile.md) · [User Personas](06-user-personas.md) · [Functional Requirements](03-functional-requirements.md)

---

## 1. Dashboard Architecture Overview

Four distinct dashboard interfaces, all delivered as a single Next.js web application with role-based routing:

| Dashboard             | Primary Users                   | Access                                 | Key Screens                                           |
| --------------------- | ------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| **Police/Responder**  | SI Dorjee (P6), SDRF Meera (P7) | Operator, Dispatcher, Supervisor roles | Incident queue, incident detail, map, zone management |
| **Hospital**          | Nurse Anitha (P9)               | Hospital role                          | Patient identification, medical cards, access log     |
| **Tourism Authority** | Joseph (P8)                     | Tourism Admin role                     | Analytics, advisory broadcasting, zone management     |
| **System Admin**      | System administrators           | sys_admin role                         | User management, configuration, health, audit         |

---

## 2. Police/Responder Dashboard

### 2.1 Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  Top Bar: Logo | Search | Notifications (🔔) | User Menu     │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Left      │              Main Content Area                  │
│  Sidebar   │                                                 │
│            │  (Incident Queue / Map / Incident Detail /      │
│  - Queue   │   Zone Mgmt / Reports)                         │
│  - Map     │                                                 │
│  - Zones   │                                                 │
│  - Reports │                                                 │
│  - Settings│                                                 │
│            │                                                 │
├────────────┴─────────────────────────────────────────────────┤
│  Status Bar: Connected ● | Active Incidents: 3 | Officers: 2 │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Incident Queue Screen

**Purpose**: Real-time list of all active incidents, priority-sorted.

#### Queue Table Columns

| Column   | Width | Content                                                                                | Sort                     |
| -------- | ----- | -------------------------------------------------------------------------------------- | ------------------------ |
| Priority | 60px  | Colour-coded badge: CRITICAL (red pulse), HIGH (orange), MODERATE (yellow), LOW (blue) | Default sort: descending |
| Time     | 80px  | Time since creation: "2m", "14m", "1h" — live-updating                                 | —                        |
| Tourist  | 180px | Name + photo thumbnail + nationality flag. "Unverified" badge if no KYC                | —                        |
| Type     | 100px | SOS type icon + label: Medical 🏥, Police 🚔, Silent 🤫, Anomaly ⚠️, General           | Filterable               |
| Location | 200px | District/area name + coordinates. Tappable → map view                                  | —                        |
| Status   | 120px | State badge: New, Acknowledged, Assigned, En Route, On Scene                           | Filterable               |
| Operator | 120px | Assigned operator name. "Unassigned" in red if pending                                 | Filterable               |
| Actions  | 100px | "Ack" button (if unacknowledged), "View" link                                          | —                        |

#### Queue Behaviour

| Behaviour             | Specification                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New SOS arrival**   | Row slides in at top with yellow flash animation (300ms). Audible alert: distinct tone for CRITICAL vs WARNING. Tone repeats every 30s until acknowledged. |
| **Real-time updates** | Via WebSocket. Status changes animate in-place (200ms).                                                                                                    |
| **SLA violation**     | Row background turns red if unacknowledged past SLA (60s). Pulsing border.                                                                                 |
| **COVERT incidents**  | Marked with 🤫 icon. Row has subtle visual differentiation. "DO NOT CALL BACK" prominently displayed.                                                      |
| **Filtering**         | Filter bar: type, status, jurisdiction, date range, severity. Active filters shown as chips.                                                               |
| **Empty state**       | "No active incidents. System monitoring normally." with green checkmark.                                                                                   |

#### New SOS Alert Overlay

When a new SOS arrives and the operator is on any screen:

| Element            | Specification                                                                           |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Overlay**        | Semi-transparent dark overlay covering entire viewport                                  |
| **Alert Card**     | Centre of screen, 400px width. Red border, pulsing.                                     |
| **Content**        | Tourist photo + name + type + location on mini-map + "ACK NOW" button                   |
| **Sound**          | Distinct alert tone. Volume independent of system. Repeats every 30s.                   |
| **Dismiss**        | Only dismissible by clicking "ACK NOW" (acknowledges incident) or "View Details"        |
| **COVERT variant** | Same alert but with "⚠️ SILENT SOS — DO NOT CALL TOURIST" banner. No call-back options. |

### 2.3 Incident Detail Screen

**Purpose**: Complete context for a single incident. Everything an operator needs without switching screens.

#### Layout

```
┌───────────────────────────────────────────────────────────┐
│  Back | Incident #INC-5T8 | Status: EN ROUTE | Priority   │
├───────────────────────┬───────────────────────────────────┤
│                       │                                   │
│   Map                 │   Tourist Context Card            │
│   (Live location      │   ┌─────────────────────────────┐ │
│    with accuracy      │   │ Photo | Name (✓ Verified)   │ │
│    radius,            │   │ Age: 34 | Spain 🇪🇸          │ │
│    route history,     │   │ Blood: B+ (⚠ self-declared) │ │
│    nearby zones)      │   │ Allergies: Penicillin (⚠)   │ │
│                       │   │ Insurance: Allianz #P291     │ │
│                       │   │ Trip: Shillong, Jul 8-12     │ │
│                       │   │ Consent: Full Monitoring      │ │
│                       │   │ Battery: 18% | Network: EDGE │ │
│                       │   │ Contacts: Maria (+34...), ... │ │
│                       │   └─────────────────────────────┘ │
│                       │                                   │
│                       │   Action Buttons                  │
│                       │   [Acknowledge] [Assign Unit]     │
│                       │   [Escalate] [Call Tourist]       │
│                       │   [Merge] [Close]                 │
├───────────────────────┴───────────────────────────────────┤
│  Incident Timeline (scrollable, full width)               │
│  14:02 — SOS Received (app) ─ chain ✓                    │
│  14:03 — Acknowledged by SI Dorjee (41s) ─ chain ✓       │
│  14:06 — Unit UK-12 assigned ─ chain ✓                    │
│  ... (each entry with actor, timestamp, hash indicator)    │
│  Integrity: "12 events · Chain verified ✓"                │
├───────────────────────────────────────────────────────────┤
│  Evidence (photos, audio) | Notes | Related Incidents     │
└───────────────────────────────────────────────────────────┘
```

#### Action Buttons Specification

| Button            | Name                | Visibility                                              | Enabled                   | API Called                                         | Behaviour                                                                                                 |
| ----------------- | ------------------- | ------------------------------------------------------- | ------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Acknowledge**   | "Acknowledge SOS"   | Only when status = CREATED                              | Always                    | `POST /sos/{id}/acknowledge`                       | Sets status to ACKNOWLEDGED. Records operator + timestamp. Pushes status to tourist app. Stops SLA timer. |
| **Assign Unit**   | "Assign Responder"  | After acknowledgement                                   | If units available        | `POST /incidents/{id}/status {toState: ASSIGNED}`  | Unit selector dropdown → assignment. ETA auto-calculated if unit has GPS.                                 |
| **Escalate**      | "Escalate"          | Always on active incidents                              | Always                    | `POST /incidents/{id}/status {toState: ESCALATED}` | Escalation reason dialog → supervisor queue + optional SDRF notification.                                 |
| **Call Tourist**  | "📞 Call Tourist"   | Active incidents, non-COVERT                            | Hidden for COVERT         | Browser tel: link to tourist phone                 | Browser dial. Call event logged.                                                                          |
| **Merge**         | "Merge Incidents"   | Multiple incidents from same tourist or spatial cluster | If merge candidates exist | `POST /incidents/{id}/merge`                       | Incident selector → preview merge → confirm. Both timelines preserved.                                    |
| **Close**         | "Close Incident"    | On-scene or later states                                | Requires disposition code | `POST /incidents/{id}/status {toState: CLOSED}`    | Disposition code selector + summary. Closure pushed to tourist.                                           |
| **Link External** | "Link 112 Incident" | Always                                                  | Always                    | `POST /incidents/{id}/link`                        | For when tourist also called 112 separately. Links reference IDs.                                         |

### 2.4 Map View

**Purpose**: Geographic overview of all active incidents, tourist locations (for active incidents only), zones, and responder units.

| Layer                   | Display                                                              | Interaction                               |
| ----------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| **Active Incidents**    | Red pulsing markers. Size reflects severity.                         | Click → incident detail sidebar           |
| **Tourist Last-Fix**    | Blue dot with accuracy circle. Staleness indicator (fades with age). | Hover → tooltip with fix age and accuracy |
| **Responder Units**     | Green vehicle icons with unit ID.                                    | Click → unit detail                       |
| **Advisory Zones**      | Yellow semi-transparent polygons                                     | Click → zone detail                       |
| **Restricted Zones**    | Red hatched polygons                                                 | Click → zone detail                       |
| **Disaster Zones**      | Red pulsing outline, red fill at 10% opacity                         | Click → roll-call view                    |
| **Staleness Indicator** | Location dots fade to grey after 60s                                 | Visual cue — operator knows data is old   |

**Map controls**: Zoom, pan, layer toggles, search, satellite/terrain toggle. Map library: Leaflet with OpenStreetMap tiles (no Google dependency for dashboard).

### 2.5 Zone Management Screen

| Element               | Specification                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zone List**         | Table: name, class, status (draft/active/expired), created by, approved by, version, expiry                                                                    |
| **Draw Zone**         | Map drawing tools: polygon, circle. Snap-to-road option.                                                                                                       |
| **Zone Editor**       | Name, class selector, buffer metres, schedule (active hours), expiry date, description (template or custom)                                                    |
| **Approval Workflow** | Advisory: tourism admin approves. Restricted: police + DM. Disaster: two-person emergency publish. Status badges: Draft → Pending Approval → Active → Expired. |
| **Version History**   | Each version preserved. Diff view showing polygon changes.                                                                                                     |

---

## 3. Hospital Dashboard

### 3.1 Patient Identification Screen

**Purpose**: Scan QR → display medical card. Minimal UI for high-stress casualty environment.

| Element         | Specification                                                 |
| --------------- | ------------------------------------------------------------- |
| **QR Scanner**  | Large viewfinder, full screen. Camera access via browser API. |
| **Result Card** | After scan — immediate display:                               |

#### Medical Card Display

| Field                  | Position               | Display                                  | Provenance          |
| ---------------------- | ---------------------- | ---------------------------------------- | ------------------- |
| **Name**               | Top, large text (20sp) | "Elena García"                           | ✓ Passport Verified |
| **Photo**              | Top-right, 80px        | KYC photo                                | ✓ Verified          |
| **Age**                | Below name             | "34"                                     | ✓ Passport Verified |
| **Nationality**        | Below age              | "Spain 🇪🇸"                               | ✓ Passport Verified |
| **Blood Group**        | Prominent red badge    | "B+"                                     | ⚠ Self-Declared     |
| **Allergies**          | Yellow highlight       | "Penicillin"                             | ⚠ Self-Declared     |
| **Medications**        | Below allergies        | "Amlodipine 5mg daily"                   | ⚠ Self-Declared     |
| **Conditions**         | Below medications      | "Hypertension"                           | ⚠ Self-Declared     |
| **Emergency Contacts** | Bottom section         | "Maria García: +34 612..." (tap to call) | —                   |
| **Insurance**          | Below contacts         | "Allianz Global: Policy #P291..."        | ⚠ Self-Declared     |
| **Incident Ref**       | Footer                 | "Linked to incident INC-5T8"             | System              |

**Critical design requirement**: Every self-declared field has a visible ⚠ badge. Hospital staff must know which information is verified by KYC and which is tourist-entered. Provenance determines clinical decision confidence.

### 3.2 Access Log

| Column        | Content                               |
| ------------- | ------------------------------------- |
| Timestamp     | When the QR was scanned               |
| Staff         | Who scanned (logged-in hospital user) |
| Facility      | Which hospital                        |
| Incident      | Linked incident reference             |
| Data Accessed | Which fields were displayed           |
| Grant Status  | Active / Expired                      |

---

## 4. Tourism Authority Dashboard

### 4.1 Analytics Dashboard

| Widget                     | Content                                                       | Privacy              |
| -------------------------- | ------------------------------------------------------------- | -------------------- |
| **Tourist Count**          | Current active trips in state/district (live counter)         | Aggregate count only |
| **Incident Summary**       | By type, severity, region. Trend chart (7/30/90 days).        | Anonymised           |
| **Zone Density**           | H3 hexagon heatmap of tourist density. k≥20 suppression.      | No individual dots   |
| **Response Time**          | Average SOS→ack, ack→dispatch, dispatch→on-scene by district. | Aggregate            |
| **Advisory Effectiveness** | Read rate, acknowledgement rate per advisory.                 | Aggregate            |
| **Top Destinations**       | Ranked by tourist count. Trend arrows.                        | Aggregate            |

All analytics use truncated coordinates (3 decimal places ≈ 110m). No drill-down to individual tourists. Export in anonymised format only.

### 4.2 Advisory Broadcasting

| Element               | Specification                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Template Library**  | Pre-approved templates for common scenarios (weather, theft, road closure, festival safety). Multilingual. |
| **Custom Advisory**   | Free-text with character limit. Requires DM approval.                                                      |
| **Zone Targeting**    | Select zones or regions to target. Preview recipient count.                                                |
| **Channel Selection** | Push (default), SMS (high-priority), Email (supplementary).                                                |
| **Approval Workflow** | Author → DM review → Schedule or send immediately.                                                         |
| **Delivery Report**   | Sent count, delivered count, read count, acknowledge count.                                                |

### 4.3 Ministerial Report View

Auto-refreshing page with large-format numbers and charts suitable for projection. PDF export. No PII at any level. Configurable date ranges.

---

## 5. System Admin Dashboard

### 5.1 User & Role Management

| Element             | Specification                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **User List**       | Table: name, email, role, organisation, MFA status, last login, status (active/suspended)                  |
| **Create User**     | Form: name, email, role selector, organisation selector. No self-signup.                                   |
| **Role Assignment** | Roles: operator, dispatcher, supervisor, hospital, tourism_admin, sys_admin, auditor. Organisation-scoped. |
| **MFA Enforcement** | All authority users require TOTP MFA. Status indicator. Reset option (supervisor only).                    |

### 5.2 Configuration Management

| Element             | Specification                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Config Registry** | Versioned key-value configuration. Categories: Risk Engine, Check-in, Geo-fence, Notification, System. |
| **Edit**            | Edit values with preview of current vs. new. Save creates new version.                                 |
| **Rollback**        | One-click rollback to any previous version. Changes take effect without restart.                       |
| **Audit Trail**     | Every config change: who, when, old value, new value.                                                  |

### 5.3 System Health

| Metric                     | Display                    | Alert Threshold              |
| -------------------------- | -------------------------- | ---------------------------- |
| API Latency (p95)          | Line chart + current value | >2s warning, >5s critical    |
| Database Connection Pool   | Gauge: used/total          | >80% warning, >95% critical  |
| Queue Depth                | Bar chart per queue type   | SOS queue >5: critical       |
| WebSocket Connections      | Counter                    | —                            |
| Blockchain Anchor Queue    | Counter + last anchor time | >100 pending: warning        |
| Notification Delivery Rate | Percentage per channel     | <95%: warning                |
| Uptime                     | Percentage (current month) | <99.9%: warning for SOS path |

### 5.4 Audit Log Viewer

| Filter      | Options                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| Date Range  | Calendar picker                                                           |
| User        | Dropdown + search                                                         |
| Action Type | Login, data access, config change, role change, break-glass, zone publish |
| Resource    | Incident, user, zone, config                                              |
| Export      | CSV, JSON. Export itself logged.                                          |

---

## 6. Dashboard Universal Standards

### 6.1 Responsive Design

- Minimum viewport: 1024px width (designed for desktop/laptop use)
- Tablet (landscape): supported with collapsed sidebar
- Mobile: not supported — dashboards are operational tools used at desks/stations

### 6.2 Real-Time Updates

- WebSocket connection maintained with 25-second heartbeat
- Connection status indicator: green dot = connected, red dot = disconnected
- On disconnect: automatic reconnection with jittered exponential backoff
- Staleness indicator shown if >10 seconds without heartbeat
- Fallback: polling every 5 seconds if WebSocket fails

### 6.3 Keyboard Accessibility

- All actions keyboard-accessible
- Visible focus indicators
- Keyboard shortcuts for critical actions: Ctrl+A = acknowledge, Ctrl+E = escalate
- Tab order follows logical flow

### 6.4 Print / Export

- Incident detail printable (clean layout, no navigation)
- Timeline exportable as PDF
- Analytics exportable as PDF or CSV
- DEMO DATA watermark on all demo/staging environments

---

## References

- [UI Specification — Mobile](08-ui-specification-mobile.md)
- [User Personas](06-user-personas.md)
- [Functional Requirements](03-functional-requirements.md)
- [Form Specifications](10-form-specifications.md)
- [Real-Time Communication](16-realtime-communication.md)
