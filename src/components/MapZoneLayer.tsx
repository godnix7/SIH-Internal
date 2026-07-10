import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCoordinates } from '@/src/lib/formatters';
import { mapsEnabled } from '@/src/lib/maps';
import type { Coordinates, Zone } from '@/src/lib/types';
import { space, type } from '@/src/theme/tokens';
import { useAppColors } from './ui';

function zoneColor(zone: Zone, c: ReturnType<typeof useAppColors>): string {
  if (zone.class === 'advisory') return c.sky;
  if (zone.class === 'corridor') return c.trail;
  return c.signal;
}

/** Shown when no Google Maps API key is configured; the zone data is still real. */
function MapUnavailable({ zones, center }: { zones: Zone[]; center: Coordinates }) {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <View
      style={[styles.wrap, styles.fallback, { backgroundColor: c.card, borderColor: c.hairline }]}
    >
      <Text style={[type.caption, { color: c.slate }]}>{t('maps.unavailable')}</Text>
      <Text style={[type.body, { color: c.ink }]}>
        {t('maps.lastKnown', {
          coords: formatCoordinates(center.latitude, center.longitude),
          accuracy: Math.round(center.accuracy),
        })}
      </Text>
      {zones.map((zone) => (
        <View key={zone.id} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: zoneColor(zone, c) }]} />
          <Text style={[type.caption, { color: c.slate }]}>
            {zone.name} · {t(`zoneClass.${zone.class}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

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
  if (!mapsEnabled) return <MapUnavailable zones={zones} center={center} />;
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
  fallback: { borderWidth: 1, padding: space.md, gap: space.xs, justifyContent: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
