import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { MapPin, ShieldCheck, Umbrella, Building2, Phone, Sparkles } from 'lucide-react-native';
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
import { useLocationEngine } from '@/src/services/locationEngine';
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
  const { profile, trips, online, sos, addAlert, zones, fetchZones } = useAppStore();
  const engineState = useLocationEngine();
  const trip = activeTrip(trips);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [gpsActive, setGpsActive] = useState<boolean>(true);

  // Monitor GPS Status continuously during an active trip
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
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
    void fetchZones();
    const zoneInterval = setInterval(() => {
      void fetchZones();
    }, 30000);

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

    return () => clearInterval(zoneInterval);
  }, []);

  const state = isSosActive(sos)
    ? 'emergency'
    : !trip
      ? 'idle'
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
        <MonitoringStatusPill
          state={state}
          onPress={() =>
            state === 'emergency' ? router.push('/sos/active') : router.push('/settings/privacy')
          }
        />
      </View>
      {!online && <OfflineBar />}
      {trip?.status === 'active' && zones && zones.length > 0 && (
        <Card>
          {trip?.status === 'active' && engineState.mode === 'HIGH_RISK' && (
            <Card
              style={{
                backgroundColor: c.errorContainer,
                borderColor: c.critical,
                borderWidth: 1,
                marginBottom: 12,
              }}
            >
              <Text style={[type.subtitle, { color: c.critical }]}>⚠️ DANGER ZONE</Text>
              <Text style={[type.body, { color: c.onSurface, marginTop: 4 }]}>
                You have entered a high-risk geofence. Please proceed with extreme caution or
                evacuate.
              </Text>
            </Card>
          )}
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color={c.primary} />
              <Text style={[type.subtitle, { color: c.onSurface, fontWeight: '700' }]}>
                Geofence Safety Score
              </Text>
            </View>
            <View
              style={{
                backgroundColor:
                  (zones[0].safetyScore ?? zones[0].safety_score ?? 100) < 40
                    ? '#7f1d1d'
                    : (zones[0].safetyScore ?? zones[0].safety_score ?? 100) < 76
                      ? '#713f12'
                      : '#064e3b',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color:
                    (zones[0].safetyScore ?? zones[0].safety_score ?? 100) < 40
                      ? '#ef4444'
                      : (zones[0].safetyScore ?? zones[0].safety_score ?? 100) < 76
                        ? '#eab308'
                        : '#10b981',
                  fontWeight: '800',
                  fontSize: 12,
                }}
              >
                SCORE: {zones[0].safetyScore ?? zones[0].safety_score ?? 100}/100
              </Text>
            </View>
          </View>
          <Text style={[type.body, { color: c.onSurfaceVariant, marginTop: 6 }]}>
            Monitoring {zones.length} active police geofence{zones.length > 1 ? 's' : ''} (
            {zones[0].name}).
            {(zones[0].safetyScore ?? zones[0].safety_score ?? 100) < 40 &&
              ` ⚠️ DANGER WARNING: High crime/hazard frequency reported in this sector.`}
          </Text>
        </Card>
      )}
      {trip ? (
        <Card>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: space.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: gpsActive ? c.success : c.critical,
                }}
              />
              <Text
                style={[
                  type.caption,
                  { color: gpsActive ? c.success : c.critical, fontWeight: '600' },
                ]}
              >
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
            <CheckInCountdown target={trip.nextCheckInAt} paused={trip.status === 'paused'} />
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
      <Card
        style={{
          borderColor: c.primary,
          borderWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: space.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
          <Sparkles color={c.primary} size={24} />
          <View style={{ flex: 1 }}>
            <Text style={[type.subtitle, { color: c.onSurface, fontWeight: '700' }]}>
              Offline Edge AI Triage & First-Aid
            </Text>
            <Text style={[type.caption, { color: '#16a34a', fontWeight: 'bold' }]}>
              ● ZERO-CONNECTIVITY READY
            </Text>
          </View>
        </View>
        <Button
          label="Open"
          variant="secondary"
          onPress={() => router.push('/emergency-ai' as any)}
        />
      </Card>
      <View style={{ gap: space.xs }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={[type.title, { color: c.onSurface }]}>{t('home.nearby')}</Text>
          <Button
            label="View on Map"
            variant="outline"
            onPress={() => router.push('/facilities/map')}
          />
        </View>
        <Card>
          {loadingFacilities ? (
            <View style={{ padding: space.md, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : facilities.length > 0 ? (
            facilities.map((f) => (
              <ListRow
                key={f.id}
                icon={
                  f.type === 'hospital' ? (
                    <Building2 color={c.critical} />
                  ) : (
                    <MapPin color={c.primary} />
                  )
                }
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
