# Engineering decisions

## D-01: React Native is the application client

The supplied build prompt requires Expo React Native. The supporting architecture report recommends Flutter as an alternative, but the build prompt takes precedence. Native capabilities are therefore exercised through an Expo custom development client rather than Expo Go.

## D-02: Offline mutation safety uses a single encrypted outbox

All user-originated mutations are represented as idempotent queue items. The queue order is `SOS > GEOFENCE_CRITICAL > CHECKIN > LOCATION_BATCH > MEDIA`; queue keys live in SecureStore and SQLCipher is enabled by the Expo SQLite plugin. The server treats each client queue ID as an idempotency key.

## D-03: Geofencing is local and conservative

The app evaluates downloaded polygon packs on device. Restricted entries require accuracy under 30 m, two consecutive inside fixes, and a five-minute zone cooldown. A low-confidence boundary reading is displayed as uncertain rather than uploaded as a restricted event. Advisory entries remain local.

## D-04: SOS starts before authentication and survives restarts

The SOS record is persisted in SecureStore at countdown start, and a root-level restorer returns to the active SOS route after a process restart. Cancellation requires demo PIN `1122`. A production implementation must replace that value with a user-set PIN protected by platform authentication.

## D-05: The mock operator is deliberately separate from the app

`/mock-server` is a Node/Fastify/Socket.IO process. It serves a local Leaflet dashboard with a permanent **DEMO DATA** watermark. It schedules an acknowledgement after 8 seconds and an en-route update after 11 seconds so the app's real socket path is demonstrable without a live agency.

## D-06: No fake emergency integration

112 is always shown as the parallel emergency route. No API call claims to contact ERSS, police, hospitals, DigiLocker, an SMS carrier, or a responder. The pre-filled SMS target is an explicitly documented demo shortcode.

## D-07: Native power-button SOS is deferred

Intercepting five physical power-button presses needs a platform-specific Android foreground-service/native-module design and policy review. It is not implemented in this Expo build and must not be represented as working. The app provides a one-tap raised Shield tab and hold-to-confirm interaction instead.

## D-08: AI is intentionally rules-first

The project does not score people or implement fake-report detection. It uses deterministic tier and geofence rules. A real anomaly model needs pilot data, human review, false-positive metrics, and a privacy assessment before it can influence emergency escalation.

## D-09: Scope boundaries

This is a development-quality demonstrator. Production requires tested permissions across OEMs, real secure backend infrastructure, a validated retention workflow, evidence upload pipeline, accessibility audit, human Hindi review, penetration test, and formal agency/telecom/legal agreements.
