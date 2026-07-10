import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

import type { Coordinates, Zone } from '@/src/lib/types';
import { useAppColors } from './ui';

export function MapZoneLayer({
  zones,
  location,
  showTrail = false,
}: {
  zones: Zone[];
  location?: Coordinates;
  showTrail?: boolean;
}) {
  const c = useAppColors();
  const center = location ?? {
    latitude: 30.7351,
    longitude: 78.4429,
    accuracy: 25,
    timestamp: 0,
  };
  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        provider={undefined}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        showsUserLocation
      >
        {zones.map((zone) => (
          <Polygon
            key={zone.id}
            coordinates={zone.polygon[0].map(([longitude, latitude]) => ({ latitude, longitude }))}
            fillColor={
              zone.class === 'advisory'
                ? 'rgba(44,95,138,0.12)'
                : zone.class === 'corridor'
                  ? 'rgba(31,111,84,0.15)'
                  : 'rgba(194,64,42,0.10)'
            }
            strokeColor={
              zone.class === 'advisory'
                ? `${c.sky}88`
                : zone.class === 'corridor'
                  ? `${c.trail}88`
                  : `${c.signal}AA`
            }
            strokeWidth={2}
          />
        ))}
        {showTrail && (
          <Polyline
            coordinates={[
              { latitude: center.latitude - 0.009, longitude: center.longitude - 0.009 },
              { latitude: center.latitude, longitude: center.longitude },
            ]}
            strokeColor={c.trail}
            strokeWidth={4}
          />
        )}
        <Marker
          coordinate={{ latitude: center.latitude, longitude: center.longitude }}
          title="Your last known location"
          description={`Accuracy ±${Math.round(center.accuracy)} m`}
          pinColor={c.trail}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 220, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
});
