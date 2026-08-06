// import MapLibreGL from '@maplibre/maplibre-react-native';
const MapLibreGL = {
  setAccessToken: (_token?: string | null) => {},
  StyleURL: { Street: 'street' },
  MapView: ({ children, style }: any) => <View style={style}>{children}</View>,
  Camera: (_props?: any) => <View />,
  UserLocation: (_props?: any) => <View />,
  ShapeSource: ({ children }: any) => <View>{children}</View>,
  FillLayer: (_props?: any) => <View />,
  LineLayer: (_props?: any) => <View />,
  PointAnnotation: ({ children }: any) => <View>{children}</View>,
};
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatCoordinates } from '@/src/lib/formatters';
import type { Coordinates, Zone } from '@/src/lib/types';
import { space, type } from '@/src/theme/tokens';
import { useAppColors } from './ui';

MapLibreGL.setAccessToken(null);

function zoneColor(zone: Zone, c: ReturnType<typeof useAppColors>): string {
  if (zone.class === 'advisory') return c.primary;
  if (zone.class === 'corridor') return c.primary;
  return c.critical;
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

  const geoJsonSource = {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [zone.polygon[0].map(([lon, lat]) => [lon, lat])],
      },
      properties: {
        id: zone.id,
        class: zone.class,
        name: zone.name,
        safetyScore: zone.safetyScore ?? zone.safety_score ?? 100,
      },
    })),
  };

  const dangerZone = zones.find(
    (z) =>
      (z.safetyScore ?? z.safety_score ?? 100) < 50 ||
      z.class === 'restricted' ||
      z.class === 'disaster',
  );

  return (
    <View style={[styles.wrap, dangerZone && { borderWidth: 2, borderColor: c.critical }]}>
      {dangerZone && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            right: 10,
            backgroundColor: 'rgba(127, 29, 29, 0.95)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: space.xs,
            borderWidth: 1,
            borderColor: '#ef4444',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ color: '#fca5a5', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>
              ⚠️ OFFLINE MAP GEOFENCE HIGHLIGHT
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>
              {dangerZone.name} · Safety Score:{' '}
              {dangerZone.safetyScore ?? dangerZone.safety_score ?? 100}/100
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#dc2626',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 10 }}>HIGH RISK</Text>
          </View>
        </View>
      )}
      <MapLibreGL.MapView style={styles.map} logoEnabled={false}>
        <MapLibreGL.Camera zoomLevel={12} centerCoordinate={[center.longitude, center.latitude]} />
        <MapLibreGL.UserLocation visible={true} />

        <MapLibreGL.ShapeSource id="zones" shape={geoJsonSource as any}>
          <MapLibreGL.FillLayer
            id="zoneFill"
            style={{
              fillColor: [
                'match',
                ['get', 'class'],
                'advisory',
                'rgba(44,95,138,0.12)',
                'corridor',
                'rgba(31,111,84,0.15)',
                'rgba(220,38,38,0.25)',
              ],
            }}
          />
          <MapLibreGL.LineLayer
            id="zoneLine"
            style={{
              lineColor: [
                'match',
                ['get', 'class'],
                'advisory',
                `${c.primary}88`,
                'corridor',
                `${c.primary}88`,
                '#dc2626',
              ],
              lineWidth: 3,
            }}
          />
        </MapLibreGL.ShapeSource>
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: space.sm,
    overflow: 'hidden',
    marginBottom: space.lg,
    position: 'relative',
  },
  map: { flex: 1 },
});
