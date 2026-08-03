// import MapLibreGL from '@maplibre/maplibre-react-native';
const MapLibreGL = {
  setAccessToken: () => {},
  StyleURL: { Street: 'street' },
  MapView: ({ children, style }: any) => <View style={style}>{children}</View>,
  Camera: () => <View />,
  UserLocation: () => <View />,
  ShapeSource: ({ children }: any) => <View>{children}</View>,
  FillLayer: () => <View />,
  LineLayer: () => <View />,
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
      },
    })),
  };

  return (
    <View style={styles.wrap}>
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
                'rgba(194,64,42,0.10)',
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
                `${c.critical}AA`,
              ],
              lineWidth: 2,
            }}
          />
        </MapLibreGL.ShapeSource>
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 200, borderRadius: space.sm, overflow: 'hidden', marginBottom: space.lg },
  map: { flex: 1 },
});
