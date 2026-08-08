import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { ArrowLeft, Building2, Phone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { useAppColors, Button } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

type Facility = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
  lat: number;
  lng: number;
};

// Hardcoded fallback for Bangalore if API fails
const BANGALORE_HOSPITALS: Facility[] = [
  {
    id: '1',
    name: 'Manipal Hospital',
    type: 'hospital',
    address: 'HAL Old Airport Rd',
    phone: '+918025024444',
    lat: 12.9587,
    lng: 77.6482,
  },
  {
    id: '2',
    name: 'Apollo Hospitals',
    type: 'hospital',
    address: 'Bannerghatta Road',
    phone: '+918026304050',
    lat: 12.8962,
    lng: 77.5982,
  },
  {
    id: '3',
    name: 'Fortis Hospital',
    type: 'hospital',
    address: 'Cunningham Road',
    phone: '+918041994444',
    lat: 12.9863,
    lng: 77.5927,
  },
  {
    id: '4',
    name: 'NIMHANS',
    type: 'hospital',
    address: 'Hosur Road',
    phone: '+918026995000',
    lat: 12.9388,
    lng: 77.5936,
  },
];

export default function FacilitiesMapScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFacilities() {
      try {
        setLoading(true);
        setError(null);
        // Default to Bengaluru Center
        let lat = 12.9716;
        let lng = 77.5946;

        const { data } = await api.get(`/facilities/nearby?lat=${lat}&lng=${lng}&radius_m=10000`);
        if (data && data.length > 0) {
          // Verify they have coordinates
          const valid = data.filter((d: any) => d.lat && d.lng);
          if (valid.length > 0) {
            setFacilities(valid);
          } else {
            setFacilities(BANGALORE_HOSPITALS);
          }
        } else {
          setFacilities(BANGALORE_HOSPITALS);
        }
      } catch (e) {
        console.error('Failed to load facilities:', e);
        setError('Could not reach servers. Showing offline cached facilities.');
        setFacilities(BANGALORE_HOSPITALS);
      } finally {
        setLoading(false);
      }
    }
    loadFacilities();
  }, []);

  return (
    <Screen noPadding>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: space.md,
          backgroundColor: c.surface,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, marginRight: 8, borderRadius: 20 }}
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={c.onSurface} size={24} />
        </TouchableOpacity>
        <View>
          <Text style={[type.title, { color: c.onSurface }]}>Healthcare Facilities</Text>
          <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Bangalore Region</Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: c.background }}>
        <MapLibreGL.MapView
          style={{ flex: 1 }}
          styleURL={MapLibreGL.StyleURL.Street}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapLibreGL.Camera
            defaultSettings={{
              centerCoordinate: [77.5946, 12.9716],
              zoomLevel: 11,
            }}
            animationDuration={0}
          />
          {facilities.map((f) => (
            <MapLibreGL.PointAnnotation key={f.id} id={f.id} coordinate={[f.lng, f.lat]}>
              <View
                style={{
                  backgroundColor: c.critical,
                  borderRadius: 15,
                  padding: 6,
                  borderWidth: 2,
                  borderColor: '#fff',
                }}
              >
                <Building2 color="#fff" size={16} />
              </View>
              <MapLibreGL.Callout title={f.name}>
                <View style={{ width: 180, padding: 8 }}>
                  <Text style={[type.body, { fontWeight: 'bold' }]}>{f.name}</Text>
                  <Text style={[type.caption, { color: '#666', marginVertical: 4 }]}>
                    {f.address}
                  </Text>
                  {f.phone && (
                    <TouchableOpacity
                      onPress={() => Alert.alert('Call', `Dialing ${f.phone}...`)}
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                    >
                      <Phone size={14} color={c.primary} style={{ marginRight: 4 }} />
                      <Text style={[type.caption, { color: c.primary }]}>{f.phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </MapLibreGL.Callout>
            </MapLibreGL.PointAnnotation>
          ))}
        </MapLibreGL.MapView>

        {loading && (
          <View
            style={{
              position: 'absolute',
              top: '40%',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <View
              style={{ backgroundColor: c.surface, padding: 16, borderRadius: 32, elevation: 4 }}
            >
              <ActivityIndicator size="large" color={c.primary} />
              <Text style={[type.caption, { color: c.onSurface, marginTop: 8 }]}>
                Loading facilities...
              </Text>
            </View>
          </View>
        )}

        {error && !loading && (
          <View
            style={{
              position: 'absolute',
              bottom: space.lg,
              left: space.md,
              right: space.md,
              backgroundColor: c.errorContainer,
              padding: space.md,
              borderRadius: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={[type.caption, { color: c.error, flex: 1 }]}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)} style={{ padding: 4 }}>
              <Text style={{ color: c.error, fontWeight: 'bold' }}>X</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Screen>
  );
}
