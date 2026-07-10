# Form Specifications

> **Document**: 10-form-specifications.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Frontend engineers, UX designers, QA  
> **Related**: [UI Specification — Mobile](08-ui-specification-mobile.md) · [UI Specification — Dashboards](09-ui-specification-dashboards.md) · [API Specification](15-api-specification.md)

---

## 1. Registration Form

### 1.1 Phone Registration

| Field         | Label        | Input Type           | Required | Max Length | Regex/Validation       | Default     | Error Messages                             | Accessibility                                 |
| ------------- | ------------ | -------------------- | -------- | ---------- | ---------------------- | ----------- | ------------------------------------------ | --------------------------------------------- |
| `countryCode` | Country Code | Dropdown with search | Yes      | —          | Valid ITU country code | +91 (India) | "Please select a country code"             | `accessibilityLabel: "Country code selector"` |
| `phoneNumber` | Phone Number | Numeric keypad       | Yes      | 15         | `/^\d{7,15}$/`         | —           | "Enter a valid phone number (7-15 digits)" | `accessibilityLabel: "Phone number"`          |

**Form Behaviour**:

- Auto-format phone number as user types (spaces for readability)
- Submit button: "Send OTP" — disabled until phone number is valid length
- Loading state: button shows spinner, input disabled
- Success: navigates to OTP entry screen
- Error: inline error below phone field + toast

### 1.2 OTP Verification

| Field | Label             | Input Type                         | Required | Max Length | Regex/Validation | Default | Error Messages                              |
| ----- | ----------------- | ---------------------------------- | -------- | ---------- | ---------------- | ------- | ------------------------------------------- |
| `otp` | Verification Code | 6-digit PIN input (separate boxes) | Yes      | 6          | `/^\d{6}$/`      | —       | "Enter the 6-digit code sent to your phone" |

**Form Behaviour**:

- Auto-advance between digit boxes
- Auto-submit on 6th digit entry
- "Resend OTP" link with 60-second cooldown timer
- 3 incorrect attempts → 5-minute lockout with visible countdown
- "Didn't receive? Try email/WhatsApp" fallback link

### 1.3 KYC — Aadhaar (Domestic)

| Field           | Label               | Input Type                         | Required | Max Length | Validation | Default    | Error Messages |
| --------------- | ------------------- | ---------------------------------- | -------- | ---------- | ---------- | ---------- | -------------- |
| `aadhaarMethod` | Verification Method | Radio: "DigiLocker" / "Offline QR" | Yes      | —          | —          | DigiLocker | —              |

**DigiLocker flow**: Redirects to DigiLocker consent page → returns with verified data → auto-populates fields below.

| Auto-populated Field | Source     | Editable | Provenance         |
| -------------------- | ---------- | -------- | ------------------ |
| `name`               | DigiLocker | No       | ✓ Aadhaar Verified |
| `dob`                | DigiLocker | No       | ✓ Aadhaar Verified |
| `photo`              | DigiLocker | No       | ✓ Aadhaar Verified |
| `address`            | DigiLocker | No       | ✓ Aadhaar Verified |

### 1.4 KYC — Passport (International)

| Field            | Label            | Input Type           | Required | Max Length | Regex/Validation                                                    | Default      | Error Messages                                          |
| ---------------- | ---------------- | -------------------- | -------- | ---------- | ------------------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `passportScan`   | Passport Photo   | Camera capture       | Yes      | —          | Image quality check (min 640×480, not blurry)                       | —            | "Photo is too blurry. Please retake in good lighting."  |
| `surname`        | Surname          | Text                 | Yes      | 100        | `/^[\p{L}\s'-]+$/u` (Unicode letters, spaces, hyphens, apostrophes) | OCR pre-fill | "Enter your surname as shown on passport"               |
| `givenNames`     | Given Names      | Text                 | Yes      | 200        | Same as surname                                                     | OCR pre-fill | "Enter your given names as shown on passport"           |
| `nationality`    | Nationality      | Dropdown with search | Yes      | —          | Valid ISO 3166-1 country                                            | OCR pre-fill | "Select your nationality"                               |
| `passportNumber` | Passport Number  | Alphanumeric         | Yes      | 20         | `/^[A-Z0-9]{5,20}$/i`                                               | OCR pre-fill | "Enter your passport number"                            |
| `dob`            | Date of Birth    | Date picker          | Yes      | —          | Must be in past; age ≥0                                             | OCR pre-fill | "Enter your date of birth"                              |
| `passportExpiry` | Passport Expiry  | Date picker          | Yes      | —          | Must be in future                                                   | OCR pre-fill | "Your passport appears expired. Please check the date." |
| `visaType`       | Visa Type        | Dropdown             | No       | —          | Valid Indian visa categories                                        | —            | —                                                       |
| `visaExpiry`     | Visa Valid Until | Date picker          | No       | —          | Must be in future                                                   | —            | "Your visa appears expired. You can still register."    |

**OCR behaviour**: Passport MRZ scanned automatically. Fields pre-filled with OCR results. Each OCR-filled field shows "📷 Scanned — please verify" hint. Editable if OCR was wrong (field marked with review flag).

---

## 2. Trip Creation Form

| Field               | Label               | Input Type                                     | Required                         | Max Length | Validation                                   | Default            | Error Messages                      |
| ------------------- | ------------------- | ---------------------------------------------- | -------------------------------- | ---------- | -------------------------------------------- | ------------------ | ----------------------------------- |
| `destination`       | Destination         | Search autocomplete (Indian cities/regions)    | Yes                              | 200        | Must match a known destination               | —                  | "Please select a valid destination" |
| `startDate`         | Start Date          | Date picker                                    | Yes                              | —          | Must be today or future; ≤90 days from now   | Today              | "Start date must be today or later" |
| `endDate`           | End Date            | Date picker                                    | Yes                              | —          | Must be ≥ startDate; ≤90 days from startDate | startDate + 3 days | "End date must be after start date" |
| `consentTier`       | Monitoring Level    | Card selector (4 options)                      | Yes                              | —          | Valid tier enum                              | CHECK_IN_ONLY      | "Please select a monitoring level"  |
| `checkInInterval`   | Check-in Interval   | Stepper (1h/2h/4h/6h/12h/24h)                  | Conditional (if tier ≥ CHECK_IN) | —          | 1–24 hours                                   | 4h                 | "Select a check-in interval"        |
| `shareWithContacts` | Share with Contacts | Multi-select from emergency contacts           | No                               | —          | Valid contact IDs                            | All contacts       | —                                   |
| `routeType`         | Route Type          | Radio: "No route" / "Road trip" / "Trek route" | No                               | —          | —                                            | No route           | —                                   |
| `trekRoute`         | Trek Route          | Dropdown (if routeType = Trek)                 | Conditional                      | —          | Valid trek corridor ID                       | —                  | "Select a trek route"               |

**Auto-save**: Form state saved locally on every field change. Survives app restart. Draft trips visible in trip list.

**Offline behaviour**: Trip creation form works offline. Trip saved as DRAFT locally. On connectivity: sync to server. Zone pack download attempted.

---

## 3. Emergency Contact Form

| Field           | Label                    | Input Type                                              | Required | Max Length | Validation                | Default                 | Error Messages               |
| --------------- | ------------------------ | ------------------------------------------------------- | -------- | ---------- | ------------------------- | ----------------------- | ---------------------------- |
| `contactName`   | Contact Name             | Text                                                    | Yes      | 100        | `/^[\p{L}\s'-]+$/u`       | —                       | "Enter the contact's name"   |
| `contactPhone`  | Phone Number             | Phone input with country code                           | Yes      | 15         | Valid phone number format | —                       | "Enter a valid phone number" |
| `relationship`  | Relationship             | Dropdown: Parent, Spouse, Sibling, Friend, Guide, Other | Yes      | —          | Valid enum                | —                       | "Select your relationship"   |
| `notifyOnTrip`  | Notify on Trip Start/End | Toggle                                                  | No       | —          | —                         | On                      | —                            |
| `notifyOnSOS`   | Notify on SOS            | Toggle                                                  | No       | —          | —                         | On (locked — always on) | —                            |
| `notifyDailyOK` | Daily "I'm OK" Message   | Toggle                                                  | No       | —          | —                         | Off                     | —                            |

**Constraints**: Minimum 0, maximum 5 emergency contacts. At least one recommended (shown as prompt, not blocker). "Notify on SOS" cannot be turned off — emergency contacts always receive SOS notifications.

---

## 4. Medical Card Form

| Field          | Label                     | Input Type                                 | Required | Max Length  | Validation         | Default | Error Messages                                 |
| -------------- | ------------------------- | ------------------------------------------ | -------- | ----------- | ------------------ | ------- | ---------------------------------------------- |
| `bloodGroup`   | Blood Group               | Dropdown: A+, A-, B+, B-, AB+, AB-, O+, O- | No       | —           | Valid blood group  | —       | —                                              |
| `allergies`    | Known Allergies           | Tag input (free text per tag)              | No       | 500 (total) | —                  | —       | "Each allergy must be under 100 characters"    |
| `medications`  | Current Medications       | Tag input (free text per tag)              | No       | 500 (total) | —                  | —       | "Each medication must be under 100 characters" |
| `conditions`   | Pre-existing Conditions   | Tag input (free text per tag)              | No       | 500 (total) | —                  | —       | "Each condition must be under 100 characters"  |
| `gpName`       | Doctor/GP Name            | Text                                       | No       | 100         | —                  | —       | —                                              |
| `gpPhone`      | Doctor/GP Phone           | Phone input                                | No       | 15          | Valid phone format | —       | "Enter a valid phone number"                   |
| `insurerName`  | Insurance Company         | Text                                       | No       | 100         | —                  | —       | —                                              |
| `policyNumber` | Policy Number             | Alphanumeric                               | No       | 50          | —                  | —       | —                                              |
| `insurerPhone` | Insurance Emergency Phone | Phone input                                | No       | 15          | Valid phone format | —       | "Enter a valid phone number"                   |

**Every field marked as ⚠ Self-Declared** in the UI when displayed to hospitals. No field in this form is verified by the system.

**Auto-save**: Every field change auto-saved. No explicit "Save" button needed. Saved confirmation shown inline.

**Offline storage**: Medical card stored locally encrypted (SecureStore). Available for QR generation offline.

---

## 5. Incident Report Form (Non-Emergency)

| Field                    | Label                              | Input Type                                                        | Required | Max Length           | Validation                           | Default                         | Error Messages                                         |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------- | -------- | -------------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------------ |
| `incidentType`           | What Happened                      | Selector: Theft, Harassment, Lost Document, Accident, Scam, Other | Yes      | —                    | Valid enum                           | —                               | "Please select what happened"                          |
| `incidentDate`           | When                               | Date-time picker                                                  | Yes      | —                    | Must be in past; within last 30 days | Current date-time               | "Date must be in the past"                             |
| `incidentLocation`       | Where                              | Map pin placement + text description                              | Yes      | 500                  | —                                    | Current location (if available) | "Please indicate where this happened"                  |
| `description`            | What Happened (Details)            | Multi-line text                                                   | Yes      | 5000                 | Minimum 20 characters                | —                               | "Please provide at least 20 characters of description" |
| `language`               | Report Language                    | Dropdown                                                          | Yes      | —                    | Supported language                   | App's current language          | —                                                      |
| `perpetratorDescription` | Description of Person(s)           | Multi-line text                                                   | No       | 2000                 | —                                    | —                               | —                                                      |
| `witnesses`              | Were there witnesses?              | Toggle + text field                                               | No       | 1000                 | —                                    | No                              | —                                                      |
| `evidence`               | Photos/Videos                      | File picker (multi-select)                                        | No       | 10 files, 20 MB each | Image/video MIME types only          | —                               | "Maximum 10 files, 20 MB each"                         |
| `policeContactDesired`   | Do you want police to contact you? | Toggle                                                            | No       | —                    | —                                    | Yes                             | —                                                      |
| `womanOfficerPreferred`  | Prefer a woman officer             | Toggle                                                            | No       | —                    | —                                    | No                              | —                                                      |

**Submission behaviour**:

- Each attached file hashed (SHA-256) client-side
- Timestamped acknowledgement generated with unique reference number
- Report hash-anchored for tamper evidence
- Routed to jurisdictional PS based on `incidentLocation`
- Tourist receives status updates (push + in-app)

---

## 6. Zone Creation Form (Dashboard)

| Field         | Label                       | Input Type                                           | Required                            | Max Length       | Validation                                                | Default                                         | Error Messages                                                     |
| ------------- | --------------------------- | ---------------------------------------------------- | ----------------------------------- | ---------------- | --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `geometry`    | Zone Boundary               | Polygon drawn on map                                 | Yes                                 | 200 vertices max | Valid polygon (no self-intersection); area ≤ class limit  | —                                               | "Zone boundary must be a valid polygon without self-intersections" |
| `name`        | Zone Name                   | Text                                                 | Yes                                 | 200              | No "unsafe" or "danger" terms (neutral language enforced) | —                                               | "Zone names must use neutral phrasing"                             |
| `class`       | Zone Class                  | Dropdown: Advisory, Restricted, Disaster (Temporary) | Yes                                 | —                | Valid enum                                                | Advisory                                        | —                                                                  |
| `description` | Description / Advisory Text | Multi-line text                                      | Yes                                 | 2000             | —                                                         | Template text (if template selected)            | "Please provide a description for this zone"                       |
| `template`    | Advisory Template           | Dropdown (optional)                                  | No                                  | —                | Valid template ID                                         | —                                               | —                                                                  |
| `bufferM`     | Buffer Distance (metres)    | Numeric                                              | Yes                                 | —                | 0–5000m                                                   | Class-default (Advisory: 100m, Restricted: 50m) | "Buffer must be between 0 and 5000 metres"                         |
| `schedule`    | Active Hours                | Time range picker (optional)                         | No                                  | —                | Valid time range                                          | 24/7 (always active)                            | —                                                                  |
| `expiresAt`   | Expiry Date                 | Date-time picker                                     | Conditional (Required for Disaster) | —                | Must be in future; ≤72h for Disaster                      | +72h for Disaster                               | "Disaster zones must expire within 72 hours"                       |
| `approver`    | Required Approver           | Auto-assigned by class                               | —                                   | —                | —                                                         | —                                               | —                                                                  |

**Area limits by class**:

- Advisory: ≤50 km²
- Restricted: ≤500 km² (military/forest zones may be large)
- Disaster: ≤1000 km² (flood/earthquake zones)

---

## 7. SOS Cancel Form (Post-Dispatch)

| Field    | Label            | Input Type                                                           | Required | Max Length | Validation                          | Default | Error Messages                         |
| -------- | ---------------- | -------------------------------------------------------------------- | -------- | ---------- | ----------------------------------- | ------- | -------------------------------------- |
| `pin`    | Cancellation PIN | 4-digit PIN (production: biometric + PIN)                            | Yes      | 4          | Matches user-set PIN (demo: `1122`) | —       | "Incorrect PIN. X attempts remaining." |
| `reason` | Cancel Reason    | Dropdown: False alarm, Accidental trigger, Situation resolved, Other | Yes      | —          | Valid enum                          | —       | "Please select a reason"               |
| `notes`  | Additional Notes | Text                                                                 | No       | 500        | —                                   | —       | —                                      |

**3 incorrect PIN attempts → 2-minute lockout**. SOS remains active during failed cancel attempts (safety: if someone else is trying to cancel the victim's SOS, it should be hard).

---

## 8. Form Validation Rules (Universal)

| Rule                         | Implementation                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Client-side validation**   | Validate on field blur + on submit. Show inline errors immediately below the field.                                               |
| **Server-side validation**   | All fields re-validated on server. Server errors mapped to field-level inline errors.                                             |
| **Required field indicator** | Asterisk (*) next to label. Screen reader announces "required".                                                                   |
| **Error styling**            | Red border on field. Error text in `error` colour below field. Error icon (⚠) inline.                                             |
| **Success styling**          | Green checkmark on validated field. Subtle green border.                                                                          |
| **Auto-save**                | Registration, medical card, trip creation forms auto-save on every change. "Saved" indicator shown.                               |
| **Offline storage**          | All form data encrypted locally. Synced on connectivity. Conflict: server state wins for profile; client state wins for drafts.   |
| **Retry on submit failure**  | "Submission failed. Tap to retry." button. Exponential backoff for automatic retries.                                             |
| **Accessibility**            | All errors announced via `accessibilityLiveRegion`. Error count announced on submit: "3 errors found. First error: phone number." |
| **Keyboard management**      | Next button advances to next field. Done button submits form. Keyboard does not obscure current field.                            |

---

## References

- [UI Specification — Mobile](08-ui-specification-mobile.md)
- [UI Specification — Dashboards](09-ui-specification-dashboards.md)
- [API Specification](15-api-specification.md)
- [Functional Requirements](03-functional-requirements.md)
- [Privacy Architecture](26-privacy-architecture.md)
