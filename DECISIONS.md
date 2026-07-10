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

## D-10: The OpenSSL runtime is packaged by our own config plugin

`expo-sqlite` compiles SQLCipher against OpenSSL but declares `io.github.ronickg:openssl` as `compileOnly`, and that artifact ships only a `prefab/` tree for native linking. Neither route places `libcrypto.so` in the APK, so `libexpo-sqlite.so` — which carries a `DT_NEEDED` entry for it — fails to load and the encrypted outbox cannot be opened. `plugins/withSqlCipherRuntime.js` extracts the prefab `libcrypto.so` per ABI into a `jniLibs` source directory. Confirm `lib/<abi>/libcrypto.so` exists in any release APK before shipping.

## D-11: A missing Maps API key degrades, it does not crash

`react-native-maps` on Android always uses the Google provider and throws `IllegalStateException` at `MapView.onCreate` without an API key. Rather than committing a key to the repository or leaving the trip and SOS screens crashing, `MapZoneLayer` renders a zone summary when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is unset, and `app.config.js` injects the key into the manifest when it is set. This follows D-03 and the monitoring pill: degradation is visible and honest, never silent.

## D-12: The integrity line reports a real check

`verifyChain` existed but no screen called it; the SOS and incident screens printed the words "chain verified" unconditionally. The integrity line now recomputes the SHA-256 chain and can read `integrity check failed`. Doing so immediately exposed a genuine defect: `canonicalJson` serialised `undefined` members as a literal while `JSON.stringify` drops them, so a chain never re-verified after being persisted and restored. A tamper-evidence claim that cannot fail is not evidence of anything.
