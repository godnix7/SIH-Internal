# 🚀 Yatri Shield: Parallel Testing Guide (Mobile & Web)

This guide is designed for a multi-person QA team to test the Yatri Shield ecosystem concurrently and verify end-to-end real-time synchronization.
*   **Tester A** will operate the **Tourist Mobile App** (Physical Android device or Emulator).
*   **Tester B** will operate the **Police/Responder Web Dashboard** (PC Browser).

---

## 🚨 Workflow 1: End-to-End Emergency SOS & Dispatch
**Scenario:** A tourist triggers a legitimate SOS. The responder acknowledges, dispatches a unit, and resolves the case in person using OTP verification.

| Step | Tester A (Tourist Mobile App) | Tester B (Responder Web Dashboard) | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **1** | Open the app, tap the **SOS EMERGENCY** button, and hold for 3 seconds. | Log in to `/login/responder`. Keep the **Dashboard** open. | **Tester A**: Siren plays, countdown finishes, screen turns red (Active SOS). |
| **2** | Observe the active tracking screen. | Monitor the **Live Incidents Map & Table**. | **Tester B**: Dashboard instantly flashes a new incident row with live GPS coordinates, battery, and altitude. |
| **3** | Wait for responder acknowledgment. | Click **"Acknowledge & Dispatch"** on the new incident row. | **Tester B**: Status changes to `INVESTIGATING`.<br>**Tester A**: Receives push/socket update: *"Rescue is en route."* |
| **4** | Wait for the rescue officer to arrive (Simulated). | Click **"Verify & Resolve"** on the incident. | **Tester B**: System prompts for a 4-digit OTP to prevent false closures. |
| **5** | Read the **4-digit Rescue OTP** displayed on the SOS screen to Tester B. | Enter the OTP provided by Tester A and click **Confirm**. | **Tester B**: Incident is marked `RESOLVED`.<br>**Tester A**: SOS tracking terminates, screen shows "Incident Resolved," and redirects to Home. |

---

## 🛑 Workflow 2: Safe PIN Cancellation (False Alarm)
**Scenario:** A tourist accidentally triggers the SOS and cancels it before police dispatch.

| Step | Tester A (Tourist Mobile App) | Tester B (Responder Web Dashboard) | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **1** | Trigger **SOS EMERGENCY** and let it activate. | Monitor **Live Incidents Table**. | **Tester B**: New SOS appears on the dashboard. |
| **2** | Immediately tap **"Cancel SOS with Safe PIN"**. | Watch the corresponding incident row. | **Tester A**: PIN prompt appears. |
| **3** | Enter the 4-digit PIN and confirm. | Keep watching the incident row. | **Tester A**: Tracking stops, app shows "SOS Cancelled", redirects to `/home`.<br>**Tester B**: Incident row automatically updates to `CANCELLED_BY_USER` and is cleared from active emergencies. |

---

## 🗺️ Workflow 3: Geofence Danger Zones & Offline Map Alerts
**Scenario:** Police authorities designate a high-risk area. The tourist's app dynamically updates and warns them.

| Step | Tester A (Tourist Mobile App) | Tester B (Responder Web Dashboard) | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **1** | Keep the app open on the **Home** or **Trips** map screen. | Navigate to **Zones/Geofences** (`/responder/zones`). Click **Create Zone**. | **Tester B**: Zone editor map opens. |
| **2** | Wait for synchronization. | Draw a polygon around **Tester A's current GPS location**. | **Tester B**: Polygon is defined. |
| **3** | Monitor the screen. | Add a **Critical** severity crime record to force the Area Safety Score below 50. Click **Save & Broadcast**. | **Tester B**: New zone is broadcasted via WebSockets/API. |
| **4** | Observe the map and notifications. | Verify the zone appears in the active list. | **Tester A**: App fetches the new zone in the background. The map instantly highlights the area in **Crimson Red**, and a High-Risk Warning banner appears on the Home screen. |

---

## 🧠 Workflow 4: Offline Edge AI Guidance (Zero Internet)
**Scenario:** A tourist loses cellular service in a remote area and needs urgent survival instructions.

| Step | Tester A (Tourist Mobile App) | Expected Outcome |
| :--- | :--- | :--- |
| **1** | Turn on **Airplane Mode** (disable Wi-Fi & Cellular Data). | App status indicator changes to `OFFLINE`. |
| **2** | Navigate to the **AI Guidance** tab (`/emergency-ai`). | Chat interface loads from local storage. |
| **3** | Tap the quick prompt **"Wild animals nearby"** or type a query. | The offline Edge AI engine processes the request instantly (Zero Latency). |
| **4** | Read/Listen to the response. | The AI provides step-by-step triage. Text-to-Speech (TTS) automatically reads the instructions out loud. |

---

## 🏕️ Workflow 5: Trip Creation & Automated Escalation
**Scenario:** A tourist begins a monitored high-altitude trek but misses their safety check-in.

| Step | Tester A (Tourist Mobile App) | Tester B (Responder Web Dashboard) | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **1** | Go to **Trips**. Click **Start New Trip**. Select "High-Altitude Trek" (Tier 2). | Go to the **Active Trips / Tourists** dashboard. | **Tester A**: Persistent GPS tracking begins. Check-in timer starts.<br>**Tester B**: New active trip appears on the monitor. |
| **2** | Force a timeout (Simulate by jumping device time forward by 4 hours). | Monitor for automated escalation alerts. | **Tester A**: Phone vibrates with "Check-in Overdue" warning.<br>**Tester B**: Trip is flagged **OVERDUE** in red, triggering SDRF alerts. |
| **3** | Open the app and tap **"I'm OK (Check-in)"**. | Watch the trip status. | **Tester A**: Timer resets.<br>**Tester B**: Status reverts to `ACTIVE` (Green). |

---

## 🔑 Workflow 6: Tourist KYC & Identity Verification
**Scenario:** Ensuring tourist identities are cryptographically bound to emergency dispatches.

| Step | Tester A (Tourist Mobile App) | Tester B (Responder Web Dashboard) | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **1** | Complete initial onboarding. Enter Passport/Aadhaar details in **KYC Screen**. | (Not involved) | **Tester A**: App generates an offline-verifiable Decentralized ID (DID) and animated QR Code. |
| **2** | Trigger an SOS. | View the Incident Details modal. | **Tester B**: The dashboard securely decrypts and displays the verified KYC identity (Name, Age, Blood Type) attached to the SOS signal. |

---
*Generated for the Yatri Shield Quality Assurance Team.*
