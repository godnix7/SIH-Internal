import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { MapPin, ShieldCheck, Umbrella, Building2, Phone } from 'lucide-react-native';
import { Text, View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Screen } from '@/src/components/Screen';
import {
  Button,
  Card,
  CheckInCountdown,
  EmptyState,
  ListRow,
  MonitoringStatusPill,
  OfflineBar,
  useAppColors,
} from '@/src/components/ui';
import { activeTrip, isSosActive, useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

type Facility = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
};

export default function HomeScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const { profile, trips, online, sos, addAlert } = useAppStore();
  const trip = activeTrip(trips);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [gpsActive, setGpsActive] = useState<boolean>(true);

  // Monitor GPS Status continuously during an active trip
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (trip) {
      const checkGps = async () => {
        try {
          const enabled = await Location.hasServicesEnabledAsync();
          setGpsActive(enabled);
        } catch {
          setGpsActive(false);
        }
      };
      checkGps();
      interval = setInterval(checkGps, 5000);
    }
    return () => clearInterval(interval);
  }, [trip]);

  useEffect(() => {
    async function loadFacilities() {
      try {
        setLoadingFacilities(true);
        // Default to Bengaluru if location fails
        let lat = 12.9716;
        let lng = 77.5946;
        
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }

        const { data } = await api.get(`/facilities/nearby?lat=${lat}&lng=${lng}&radius_m=10000`);
        setFacilities(data);
      } catch (e) {
        console.error('Failed to load facilities:', e);
      } finally {
        setLoadingFacilities(false);
      }
    }
    loadFacilities();
  }, []);

  const state = isSosActive(sos)
    ? 'emergency'
    : trip?.status === 'paused'
      ? 'paused'
      : trip?.monitoringLimited
        ? 'limited'
        : online
          ? 'live'
          : 'offline';
  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>{t('home.greeting')}</Text>
        <Text style={[type.display, { color: c.onSurface }]}>
          {profile?.name?.split(' ')[0] ?? t('home.fallbackName')}
        </Text>
        <MonitoringStatusPill state={state} onPress={() => router.push('/settings/privacy')} />
      </View>
      {!online && <OfflineBar />}
      {trip ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <View style={{ 
                width: 8, 
                height: 8, 
                borderRadius: 4, 
                backgroundColor: gpsActive ? c.success : c.critical 
              }} />
              <Text style={[type.caption, { color: gpsActive ? c.success : c.critical, fontWeight: '600' }]}>
                {gpsActive ? 'GPS ACTIVE' : 'GPS LOST'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.subtitle, { color: c.onSurface }]}>{trip.destination}</Text>
              <Text style={[type.body, { color: c.onSurfaceVariant }]}>
                {t('home.protectedWith', { tier: t(`tiers.${trip.tier}.title`) })}
              </Text>
              <Button
                label={t('common.imOk')}
                onPress={() =>
                  addAlert({
                    kind: 'checkin',
                    severity: 'info',
                    title: t('home.checkInTitle'),
                    body: t('home.checkInBody'),
                  })
                }
              />
            </View>
            <CheckInCountdown target={trip.nextCheckInAt} />
          </View>
        </Card>
      ) : (
        <EmptyState
          title={t('home.emptyTitle')}
          body={t('home.emptyBody')}
          action={
            <View style={{ width: '100%', gap: space.sm }}>
              <Button label={t('common.planTrip')} onPress={() => router.push('/trip/new')} />
              <Button 
                label="Quick Protect (Today)" 
                variant="secondary"
                onPress={async () => {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    const trip = await useAppStore.getState().createTrip({
                      destination: 'Quick Protection',
                      startDate: today,
                      endDate: today,
                      tier: 'zones',
                      partySize: 1,
                    });
                    router.push(`/trip/${trip.id}`);
                  } catch (e) {
                    console.error('Failed to start quick protect', e);
                  }
                }} 
              />
            </View>
          }
        />
      )}
      <View style={{ gap: space.xs }}>
        <Text style={[type.title, { color: c.onSurface }]}>{t('home.nearby')}</Text>
        <Card>
          {loadingFacilities ? (
            <View style={{ padding: space.md, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : facilities.length > 0 ? (
            facilities.map(f => (
              <ListRow
                key={f.id}
                icon={f.type === 'hospital' ? <Building2 color={c.critical} /> : <MapPin color={c.primary} />}
                title={f.name}
                sub={f.address || t('home.policeAidPostSub')}
                trailing={f.phone ? <Phone size={16} color={c.onSurfaceVariant} /> : undefined}
                onPress={() => {
                  if (f.phone) {
                    addAlert({
                      kind: 'system',
                      severity: 'info',
                      title: 'Calling Service',
                      body: `Dialing ${f.phone}...`,
                    });
                  }
                }}
              />
            ))
          ) : (
            <View style={{ padding: space.sm }}>
              <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
                No facilities nearby
              </Text>
            </View>
          )}
          <ListRow
            icon={<ShieldCheck color={c.warning} />}
            title={t('home.areaAdvisory')}
            sub={t('home.areaAdvisorySub')}
            onPress={() => router.push('/alerts')}
          />
        </Card>
      </View>
    </Screen>
  );
}
