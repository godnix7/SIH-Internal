/**
 * react-native-maps only supports the Google provider on Android, and MapView
 * throws `IllegalStateException: API key not found` at onCreate when no key is
 * present in the manifest. Gate the map on a configured key so a missing key
 * degrades to a readable fallback instead of taking down the screen.
 *
 * Supply EXPO_PUBLIC_GOOGLE_MAPS_API_KEY and re-run `npm run prebuild` so the
 * key reaches AndroidManifest.xml as well as the JS bundle.
 */
export const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export const mapsEnabled = googleMapsApiKey.trim().length > 0;
