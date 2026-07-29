/**
 * Injects the Google Maps API key into the Android manifest when one is supplied.
 * Without it, react-native-maps' Android MapView throws at onCreate, so the app
 * falls back to a non-map zone summary (see src/lib/maps.ts).
 *
 * Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env, then re-run `npm run prebuild`.
 */
export default ({ config }) => {
  return config;
};
