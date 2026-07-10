# UI Specification — Tourist Mobile App

> **Document**: 08-ui-specification-mobile.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Mobile engineers, UX designers, QA  
> **Related**: [User Journeys](07-user-journeys.md) · [User Personas](06-user-personas.md) · [Form Specifications](10-form-specifications.md)

---

## 1. Design System

### 1.1 Typography

- **Primary Font**: Inter (Google Fonts) — clean, highly readable, excellent for both Latin and Devanagari scripts
- **Fallback**: System default (Roboto on Android, SF Pro on iOS)
- **Scale**: 12sp caption / 14sp body / 16sp subtitle / 20sp title / 24sp headline / 32sp display

### 1.2 Colour Palette

| Token                  | Light Mode | Dark Mode | Usage                             |
| ---------------------- | ---------- | --------- | --------------------------------- |
| `primary`              | #1A73E8    | #8AB4F8   | Primary actions, links            |
| `primary-container`    | #D3E3FD    | #004A77   | Chips, selected states            |
| `surface`              | #FFFFFF    | #1C1B1F   | Backgrounds                       |
| `surface-variant`      | #F5F5F5    | #2C2C2E   | Cards, input backgrounds          |
| `on-surface`           | #1C1B1F    | #E6E1E5   | Primary text                      |
| `on-surface-variant`   | #49454F    | #CAC4D0   | Secondary text                    |
| `error`                | #B3261E    | #F2B8B5   | Errors, destructive actions       |
| `error-container`      | #F9DEDC    | #8C1D18   | Error backgrounds                 |
| `success`              | #1B873B    | #6DD58C   | Success states, "safe" indicators |
| `warning`              | #E37400    | #FFB74D   | Warnings, advisory zones          |
| `critical`             | #DC2626    | #FF6B6B   | SOS, critical alerts, emergency   |
| `monitoring-active`    | #1A73E8    | #8AB4F8   | Monitoring status pill            |
| `monitoring-emergency` | #DC2626    | #FF6B6B   | SOS mode indicator                |

### 1.3 Elevation & Shadows

- **Level 0**: Flat (most surfaces)
- **Level 1**: 1dp shadow (cards)
- **Level 2**: 4dp shadow (bottom sheets, dialogs)
- **Level 3**: 8dp shadow (FABs, modals)

### 1.4 Spacing

- **Base unit**: 4dp
- **Standard padding**: 16dp
- **Card padding**: 16dp
- **Section spacing**: 24dp
- **Touch targets**: Minimum 48dp × 48dp (accessibility requirement)

### 1.5 Corner Radius

- **Small**: 8dp (buttons, chips)
- **Medium**: 12dp (cards, inputs)
- **Large**: 16dp (bottom sheets)
- **Full**: 50% (avatars, circular elements)

---

## 2. Navigation Architecture

### 2.1 Tab Bar (Bottom Navigation)

| Position | Tab     | Icon                           | Label   | Badge                      |
| -------- | ------- | ------------------------------ | ------- | -------------------------- |
| 1        | Home    | Home icon                      | Home    | —                          |
| 2        | Trips   | Map/route icon                 | Trips   | Active trip count          |
| 3        | Shield  | Shield icon (elevated, larger) | Shield  | Red dot when SOS available |
| 4        | Alerts  | Bell icon                      | Alerts  | Unread count               |
| 5        | Profile | Person icon                    | Profile | —                          |

**Shield tab is elevated** — visually distinct, larger touch target (56dp), always accessible. This is the safety hub.

### 2.2 Screen Hierarchy

```
├── Onboarding
│   ├── Welcome + Language Selection
│   ├── Purpose (3 slides)
│   ├── Phone Registration
│   └── KYC (optional)
├── Home Tab
│   ├── Monitoring Status Pill
│   ├── Quick Actions
│   ├── Nearby Safety Info
│   └── Active Trip Summary
├── Trips Tab
│   ├── Trip List
│   ├── Create Trip
│   ├── Active Trip Detail
│   │   ├── Map View
│   │   ├── Check-in
│   │   └── Zone Info
│   └── Trip History
├── Shield Tab (Safety Hub)
│   ├── SOS Button (primary)
│   ├── Type Selection Chips
│   ├── Silent SOS Card
│   ├── Call 112 Button
│   └── Active SOS Screen
│       ├── Status Timeline
│       ├── Incident Detail
│       └── Hash-Chain Integrity
├── Alerts Tab
│   ├── Zone Advisories
│   ├── Check-in Reminders
│   ├── System Notifications
│   └── Family Notifications
└── Profile Tab
    ├── Digital Tourist ID
    ├── Medical Card
    ├── Emergency Contacts
    ├── Privacy Centre
    │   ├── Active Consents
    │   ├── Consent History
    │   ├── Data Download
    │   └── Delete Account
    ├── Language Settings
    └── About / Help
```

---

## 3. Screen Specifications

### 3.1 Onboarding — Welcome Screen

**Purpose**: First impression. Establish trust, explain purpose, select language.

| Element               | Specification                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **Background**        | Gradient: primary → primary-dark; subtle mountain/travel illustration (not a photo)      |
| **Logo**              | Yatri Shield logo, centred, 64dp                                                         |
| **Headline**          | "Travel safe. Stay connected." / "सुरक्षित यात्रा करें। जुड़े रहें।"                     |
| **Subhead**           | "Your safety companion for India. Complements 112."                                      |
| **Language Selector** | Segmented control: English / हिन्दी (expandable for future languages)                    |
| **CTA Button**        | "Get Started" — full-width, 48dp height, primary colour, rounded 8dp                     |
| **Skip Option**       | "Explore demo mode" — text link below CTA                                                |
| **Accessibility**     | VoiceOver/TalkBack: "Welcome to Yatri Shield. Select your language. Button: Get Started" |

**States**:

- Default: As described
- Loading: Not applicable (static screen)
- Error: Not applicable

### 3.2 Onboarding — Purpose Slides (3 Screens)

| Slide | Illustration                | Headline                            | Body                                                                                       |
| ----- | --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| 1     | Shield + phone illustration | "Your safety net"                   | "Background monitoring detects when you go silent. You control what's shared."             |
| 2     | Map + zone illustration     | "Know before you go"                | "Zone advisories in your language. Restricted area warnings. Trek route guidance."         |
| 3     | 112 + app illustration      | "Works with 112, not instead of it" | "SOS reaches responders with your identity and location. Always call 112 for emergencies." |

Each slide: swipeable, dot indicators, "Skip" top-right, "Next" button bottom.

### 3.3 Home Screen

**Purpose**: At-a-glance status. Quick access to critical actions.

| Element                    | Position       | Specification                                                                                   |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| **Greeting**               | Top-left       | "Good morning, Arjun" / "सुप्रभात, अर्जुन" — time-aware greeting                                |
| **Monitoring Status Pill** | Below greeting | Rounded pill showing monitoring state. See §3.3.1                                               |
| **Quick Actions Row**      | Below pill     | Horizontal scrollable: "Start a Trip", "Report Incident", "Call 112"                            |
| **Active Trip Card**       | Below actions  | If trip active: destination, duration, consent tier, check-in countdown. Tappable → Trip Detail |
| **Nearby Safety Card**     | Below trip     | Nearest police aid post (distance + name). Nearest hospital. Tappable for directions            |
| **Area Advisory Card**     | Below safety   | If inside advisory zone: zone name + advisory text. Dismissible                                 |
| **Empty State**            | Centre         | If no trip: illustration + "Plan your next trip" + CTA button                                   |

#### 3.3.1 Monitoring Status Pill

| State                              | Label                              | Colour                                        | Icon                  |
| ---------------------------------- | ---------------------------------- | --------------------------------------------- | --------------------- |
| No trip                            | "Not monitoring"                   | `surface-variant` + `on-surface-variant` text | Shield outline        |
| Active trip — Off tier             | "Trip active · Manual SOS only"    | `surface-variant` + `on-surface` text         | Shield outline        |
| Active trip — Check-ins            | "Protected · Check-ins active"     | `primary-container` + `primary` text          | Shield filled         |
| Active trip — Zone Alerts          | "Protected · Zone monitoring"      | `primary-container` + `primary` text          | Shield filled + radar |
| Active trip — Full                 | "Protected · Live monitoring"      | `primary` + `on-primary` text                 | Shield filled + pulse |
| Emergency mode                     | "SOS ACTIVE"                       | `critical` + white text, pulsing              | Exclamation           |
| Low battery mode                   | "Low battery · Reduced monitoring" | `warning` + `on-surface` text                 | Battery low           |
| Device silent (server perspective) | N/A (server-side only)             | N/A                                           | N/A                   |

**Tapping the pill** → opens a bottom sheet explaining current monitoring level with "Change" link to Privacy Centre.

### 3.4 Shield Tab (Safety Hub)

**Purpose**: SOS access. Always reachable. Never more than one tap from any screen.

| Element                  | Position           | Specification                                                                                                                        |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **SOS Button**           | Centre, dominant   | Circular, 120dp diameter, `critical` colour, "SOS" text 32sp bold. Shadow level 3. Slight pulse animation (respects reduced-motion). |
| **Hold instruction**     | Below button       | "Hold 1.5 seconds to arm" — 14sp, `on-surface-variant`                                                                               |
| **Type Selection Chips** | Below instruction  | Horizontal row: "Medical" (🏥), "Police" (🚔), "Just watch me" (👁️). Default: none selected = General. Chips are 48dp height         |
| **Silent SOS Card**      | Below chips        | Card: "Silent SOS" + description: "No sounds. Single vibration. For when you can't make noise." Toggle switch.                       |
| **Call 112 Button**      | Bottom, full-width | Outlined button, 48dp: "📞 Call 112 — India's emergency number". Opens native dialer.                                                |
| **Disclaimer**           | Below 112 button   | 12sp: "Yatri Shield complements 112 — it does not replace it."                                                                       |

**SOS Button Interaction States**:

| State                | Visual                                                                                              | Haptic                     | Sound                             |
| -------------------- | --------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------- |
| Default              | Red circle, "SOS", subtle pulse                                                                     | —                          | —                                 |
| Holding (0–1.5s)     | Ring fills clockwise around button                                                                  | Light vibration at start   | —                                 |
| Armed (1.5s reached) | Button glows brighter, "Release to activate"                                                        | Strong vibration           | Short alert tone (if not silent)  |
| Countdown (5s)       | Full-screen takeover. Large countdown number (3→2→1). "I'm safe — Cancel" button at bottom          | Tick vibration each second | Countdown beeps (if not silent)   |
| Cancel pressed       | Return to Shield tab                                                                                | —                          | —                                 |
| SOS Active           | Screen turns to SOS Status view                                                                     | Confirmation vibration     | Confirmation tone (if not silent) |
| Silent SOS Active    | Minimal visual change. Single vibration. Can navigate away. Status visible via monitoring pill only | Single subtle vibration    | None                              |

#### SOS Button Specification

| Property                 | Value                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **Name**                 | SOS Trigger Button                                                                            |
| **Purpose**              | Initiate emergency SOS                                                                        |
| **Location**             | Shield tab, centre screen                                                                     |
| **Visibility**           | Always visible when Shield tab is active                                                      |
| **Required Permissions** | None — SOS works pre-authentication via device token                                          |
| **Enabled Conditions**   | Always enabled (even without active trip, even without registration for basic SOS)            |
| **Disabled Conditions**  | Never disabled — emergency access is unconditional                                            |
| **Loading Behaviour**    | After release: 5-second countdown animation. After countdown: "Sending..." for ≤2 seconds     |
| **Confirmation**         | 5-second countdown serves as confirmation. PIN required only for post-dispatch cancel         |
| **API Called**           | `POST /sos` with Idempotency-Key = clientSosId (UUID)                                         |
| **Navigation Target**    | Transitions to SOS Active Screen after countdown                                              |
| **State Updates**        | App enters EMERGENCY monitoring mode (GPS every 3s); SOS persisted to SecureStore             |
| **Analytics Event**      | `sos_initiated` with type, silent flag, battery level, network type                           |
| **Accessibility Label**  | "SOS emergency button. Hold for one and a half seconds to activate."                          |
| **Error Handling**       | API failure → offline queue → SMS fallback. Error shown: "SOS saved. Sending when connected." |
| **Retry Behaviour**      | Automatic retry every 10s while SOS screen active. Queue persists across restart.             |
| **Offline Behaviour**    | Full offline SOS path (J8): encrypted queue + SMS fallback                                    |

### 3.5 SOS Active Screen

**Purpose**: Show tourist that help is coming. Display real-time status updates.

| Element                       | Position           | Specification                                                                                                                  |
| ----------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Status Header**             | Top                | Large text: "SOS Active" → "Help is on the way" → "Responder en route". Colour transitions: `critical` → `warning` → `primary` |
| **Status Icon**               | Below header       | Animated: pulsing red → responder icon animating → checkmark                                                                   |
| **ETA Display**               | Below icon         | "Responder ETA: ~22 minutes" (when available)                                                                                  |
| **Timeline**                  | Centre, scrollable | Chronological event list. Each entry: timestamp, actor icon, description. See §3.5.1                                           |
| **Hash-Chain Integrity Line** | Below timeline     | "5 events · Chain verified ✓" or "Integrity check failed ✗". Real computation, not label.                                      |
| **Call 112 Button**           | Bottom, prominent  | "📞 Call 112 — Always available". Full-width.                                                                                  |
| **Cancel Button**             | Bottom, secondary  | "I'm safe — Cancel SOS". Requires PIN confirmation.                                                                            |

#### 3.5.1 Incident Timeline Entry

| Field          | Display                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| Timestamp      | "14:02" in `on-surface-variant`, 12sp                                           |
| Actor Icon     | System icon (shield) / Operator icon (badge) / Unit icon (vehicle)              |
| Event Title    | Bold 14sp: "SOS Received" / "Acknowledged by SI Dorjee" / "Unit UK-12 en route" |
| Event Detail   | 12sp: "ETA 22 minutes" / "Dispatched from Uttarkashi PS"                        |
| Hash indicator | Small lock icon if event is hash-chained                                        |

### 3.6 Trip Creation Screen

**Purpose**: Create and configure a new trip.

| Element                   | Specification                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **Header**                | "Plan Your Trip"                                                                               |
| **Destination Input**     | Search field with autocomplete (Indian destinations). Map preview on selection.                |
| **Date Range**            | Calendar picker: start and end date. Minimum 1 day.                                            |
| **Route (Optional)**      | "Add route" expandable. For treks: select from predefined corridors.                           |
| **Consent Tier Selector** | See §3.6.1 — dedicated subsection                                                              |
| **Check-in Interval**     | Stepper: 1h / 2h / 4h / 6h / 12h / 24h. Default: 4h. Only shown for Check-ins/Zone/Full tiers. |
| **Emergency Contacts**    | Pre-filled from profile. Toggle share per contact. "Add contact" link.                         |
| **Start Trip Button**     | Full-width CTA: "Start Trip". 48dp height.                                                     |

#### 3.6.1 Consent Tier Selector

Four cards, vertically stacked. Each card:

| Tier                | Card Design                                                                                                                      | Data Sharing Table                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Off**             | Outline card, equal visual weight to Check-ins. Icon: shield outline. "SOS only — nothing else leaves your phone."               | No data uploaded except user-triggered SOS                 |
| **Check-ins Only**  | Filled card (default selected). Icon: clock + shield. "Periodic check-in status shared. No location data."                       | Check-in events and escalation alerts                      |
| **Zone Alerts**     | Filled card. Icon: map pin + shield. "Zone warnings on-device. Only restricted/disaster zone entries reported."                  | Restricted/disaster zone events. Advisory stays on-device. |
| **Full Monitoring** | Filled card with `primary` accent. Icon: radar + shield. "Location batches shared for maximum safety. All zone events reported." | Location batches, all zone events, mode transitions        |

**Each card expands on tap** to show a detailed plain-language table of exactly what data is collected, where it goes, who can see it, and how long it's kept. This is the DPDP-compliant consent notice.

### 3.7 Digital Tourist ID Screen

**Purpose**: Display verifiable identity credential as QR code.

| Element            | Specification                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **QR Code**        | Centre, 200dp × 200dp. Renders offline. High error-correction level.                          |
| **Name**           | Below QR: verified name from KYC. Provenance badge: "✓ Aadhaar Verified" or "⚠ Self-declared" |
| **Photo**          | Circular, 64dp, from KYC (if available)                                                       |
| **Nationality**    | Flag icon + country name                                                                      |
| **Blood Group**    | Red badge: "B+" with "⚠ Self-declared" flag                                                   |
| **Trip Status**    | "Active trip: Shillong, Jul 8-12"                                                             |
| **ID Validity**    | "Valid until: Jul 12, 2026" (auto-expires at trip end + 24h)                                  |
| **Share Button**   | "Share ID" — generates a scoped, time-limited QR link                                         |
| **Refresh Button** | Refreshes QR (rotation for security)                                                          |

### 3.8 Privacy Centre

**Purpose**: Full transparency and control over data processing.

| Section                | Content                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Active Monitoring**  | Current tier, what's being collected right now, toggle to change                     |
| **Consent History**    | Chronological list of all consent changes with timestamps                            |
| **Data Processing**    | Table: what data, purpose, retention period, who can access                          |
| **Download My Data**   | Button: generates ZIP of all personal data within 24 hours                           |
| **Delete Account**     | Button: initiates deletion request. Shows legal holds if any. Confirmation required. |
| **Consent Withdrawal** | "Stop all monitoring" — immediate effect + consequences explained                    |

### 3.9 Check-in Reminder

**Purpose**: Periodic prompt for tourist to confirm they're okay.

| State                   | Display                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Notification**        | Push notification: "Time for your check-in! Tap to confirm you're OK."                                             |
| **In-app reminder**     | Bottom sheet: large "I'm OK ✓" button (120dp wide, 56dp tall, green). Secondary: "I need help" link.               |
| **Overdue**             | Home screen banner: yellow warning: "Check-in overdue — please respond"                                            |
| **Challenge (anomaly)** | Modal overlay: "Are you OK? Please respond in 10 minutes." Countdown timer. "I'm OK" button. "I need help" button. |

---

## 4. Universal States

Every screen must handle these states:

### 4.1 Loading State

- Skeleton screens (shimmer animation) for content areas
- Inline spinners for button actions (16dp, primary colour)
- Never block SOS access during loading
- Loading indicator respects reduced-motion preference (static skeleton without shimmer)

### 4.2 Empty State

- Illustration (consistent style across app)
- Descriptive text explaining what would appear here
- CTA button to create content (e.g., "Start your first trip")

### 4.3 Error State

- Red error banner with icon
- Human-readable error message (not error codes)
- Retry button where applicable
- "Contact support" link for persistent errors
- Never show stack traces or technical details

### 4.4 Success State

- Green success banner or checkmark animation
- Confirmation text
- Auto-dismiss after 3 seconds or on user interaction
- Success animation respects reduced-motion

### 4.5 Disabled State

- Reduced opacity (38% of original)
- Non-interactive (no touch response)
- Tooltip on long-press explaining why disabled

### 4.6 Offline State

- Persistent banner at top: "You're offline. Some features may be limited."
- Offline-available features work normally (SOS queue, on-device fencing, cached data)
- Features requiring network show "Available when online" message
- No error states for offline — graceful degradation

---

## 5. Animation Specifications

| Animation            | Trigger                      | Duration                 | Easing                                    | Reduced Motion Fallback         |
| -------------------- | ---------------------------- | ------------------------ | ----------------------------------------- | ------------------------------- |
| SOS button pulse     | Idle on Shield tab           | 2s loop                  | ease-in-out                               | Static glow                     |
| SOS countdown number | Each second during countdown | 1s                       | linear                                    | Number change without animation |
| Status transition    | Incident status change       | 300ms                    | ease-out                                  | Instant state change            |
| Monitoring pill      | Mode change                  | 250ms                    | ease-in-out                               | Instant colour change           |
| Card entry           | Screen load                  | 200ms staggered per card | ease-out                                  | Instant render                  |
| Bottom sheet         | Open/close                   | 300ms                    | ease-in-out (cubic-bezier 0.4, 0, 0.2, 1) | Instant open/close              |
| Skeleton shimmer     | Loading state                | 1.5s loop                | linear                                    | Static grey blocks              |

---

## 6. Responsive Behaviour

### 6.1 Tablet Layout

- Two-column layout where appropriate (trip detail: map left, details right)
- SOS button maintains 120dp minimum regardless of screen size
- Tab bar remains at bottom (no side navigation — consistency with phone)

### 6.2 Landscape Mode

- Supported on all screens
- SOS button repositioned to bottom-right quadrant for thumb access
- Map views expand to fill width
- Timeline scrolls vertically alongside map

### 6.3 Large Text / Dynamic Type

- All text scales with system font size up to 200%
- Layout reflows to accommodate larger text (no truncation of critical info)
- SOS button text minimum 24sp regardless of system setting
- Scrollable containers accommodate expanded text

---

## 7. Dark Mode

Every colour token has a dark-mode variant (defined in §1.2). Automatic switching follows system preference. Manual override available in Profile → Settings.

**Dark mode specific rules**:

- Elevation expressed via surface colour lightness (not shadow) — Material 3 dark elevation pattern
- SOS button red remains high-contrast in dark mode (#FF6B6B background, white text)
- Map tiles switch to dark-mode variant
- QR code maintains white background for scannability

---

## 8. Accessibility Checklist

| Requirement                                      | Implementation                                               |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Screen reader labels on all interactive elements | Every button, card, input has `accessibilityLabel`           |
| Announcements for state changes                  | SOS status changes announced via `accessibilityLiveRegion`   |
| Focus order matches visual order                 | Tab order follows visual layout top-to-bottom, left-to-right |
| Touch targets ≥48dp                              | Enforced on all interactive elements; SOS button: 120dp      |
| Contrast ratios ≥4.5:1                           | All text/background combinations verified                    |
| No colour-only information                       | Status indicators use icon + colour + text                   |
| Reduced motion support                           | All animations check `prefers-reduced-motion`                |
| Screen reader support for charts/maps            | Descriptive text alternatives for map-based information      |

---

## References

- [User Journeys](07-user-journeys.md)
- [User Personas](06-user-personas.md)
- [Form Specifications](10-form-specifications.md)
- [UI Specification — Dashboards](09-ui-specification-dashboards.md)
- [Functional Requirements](03-functional-requirements.md)
