import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Text, View, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
import * as Location from 'expo-location';

import { Screen } from '@/src/components/Screen';
import {
  Button,
  Input,
  PermissionPrimer,
  TierSelector,
  Toast,
  useAppColors,
} from '@/src/components/ui';
import type { ConsentTier } from '@/src/lib/types';
import { requestTripPermissions, startMonitoring } from '@/src/services/monitoring';
import { api } from '@/src/services/api';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';



export default function NewTrip() {
  const c = useAppColors();
  const { t } = useTranslation();
  const createTrip = useAppStore((state) => state.createTrip);
  const addAlert = useAppStore((state) => state.addAlert);
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 10.0,
    longitudeDelta: 10.0,
  });
  const [dates, setDates] = useState(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      start: today.toISOString().split('T')[0],
      end: tomorrow.toISOString().split('T')[0],
    };
  });
  const [trek, setTrek] = useState(false);
  const [tier, setTier] = useState<ConsentTier>('checkins');
  const [primer, setPrimer] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string>();

  useEffect(() => {
    if (step === 4) {
      setContactsLoading(true);
      api.get('/users/me/contacts')
        .then(res => setContacts(res.data))
        .catch(err => console.error(err))
        .finally(() => setContactsLoading(false));
    }
  }, [step]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (mounted) {
            setMapRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }
      } catch (e) {
        // Silently fail and fallback to default map region
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const requestPermissionsAndStart = async () => {
    setPermissionBusy(true);
    setPermissionNotice(t('trip.waiting'));
    try {
      let permissions;
      try {
        permissions = await requestTripPermissions(tier);
      } catch {
        setPermissionNotice(t('trip.permissionFailed'));
        return;
      }
      const needsBackgroundLocation = tier === 'zones' || tier === 'full';
      const monitoringLimited =
        needsBackgroundLocation && (!permissions.foreground || !permissions.background);
      let trip;
      try {
        trip = await createTrip({
          destination,
          startDate: dates.start,
          endDate: dates.end,
          tier,
          trek: trek ? 'Sahastra Tal' : undefined,
          partySize: trek ? 4 : 1,
          monitoringLimited,
        });

        // The backend creates trips in 'draft' status by default. 
        // We must start it immediately so it becomes 'active' and appears on the Home screen.
        const res = await api.post(`/trips/${trip.id}/start`);
        trip = { ...trip, status: res.data.status };
        useAppStore.setState(state => ({
          trips: state.trips.map(t => t.id === trip.id ? trip : t)
        }));
      } catch {
        setPermissionNotice(t('trip.saveFailed'));
        return;
      }

      if (!monitoringLimited) {
        try {
          await startMonitoring(trip);
        } catch {
          addAlert({
            kind: 'system',
            severity: 'warning',
            title: t('trip.monitorWarnTitle'),
            body: t('trip.monitorWarnBody'),
          });
        }
      }
      if (monitoringLimited) {
        addAlert({
          kind: 'system',
          severity: 'warning',
          title: t('trip.limitedTitle'),
          body: t('trip.limitedBody'),
        });
      } else if (!permissions.notifications) {
        addAlert({
          kind: 'system',
          severity: 'warning',
          title: t('trip.notificationsTitle'),
          body: t('trip.notificationsBody'),
        });
      }
      setToast(true);
      setTimeout(() => router.replace(`/trip/${trip.id}`), 650);
    } finally {
      setPermissionBusy(false);
    }
  };
  const proceed = async () => {
    if (step === 1) {
      setGeocoding(true);
      try {
        const [result] = await Location.reverseGeocodeAsync({
          latitude: mapRegion.latitude,
          longitude: mapRegion.longitude,
        });
        if (result) {
          const parts = [result.city || result.subregion || result.name, result.region].filter(Boolean);
          setDestination(parts.join(', ') || 'Selected Location');
        } else {
          setDestination('Selected Location');
        }
      } catch (e) {
        setDestination('Selected Location');
      } finally {
        setGeocoding(false);
        setStep((value) => value + 1);
      }
      return;
    }
    if (step === 2) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dates.start) || !dateRegex.test(dates.end)) {
        Alert.alert('Invalid Date Format', 'Please enter dates in YYYY-MM-DD format (e.g. 2026-07-12).');
        return;
      }
      const startTime = Date.parse(dates.start);
      const endTime = Date.parse(dates.end);
      if (isNaN(startTime) || isNaN(endTime)) {
        Alert.alert('Invalid Date', 'One of the entered dates is invalid. Please check the values.');
        return;
      }
      if (endTime < startTime) {
        Alert.alert('Invalid Date Range', 'The end date cannot be before the start date.');
        return;
      }
    }

    if (step < 6) setStep((value) => value + 1);
    else if (tier === 'zones' || tier === 'full') setPrimer(true);
    else void requestPermissionsAndStart();
  };
  return (
    <Screen title={t('trip.title')} subtitle={t('trip.step', { step })}>
      {step === 1 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.subtitle, { color: c.onSurface }]}>Where to?</Text>
          <Text style={[type.caption, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>
            Enter the name of your destination.
          </Text>
          <Input
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Kedarnath, Uttarakhand"
          />
        </View>
      )}
      {step === 2 && (
        <View style={{ gap: space.sm }}>
          <Input
            label={t('trip.startDate')}
            value={dates.start}
            onChangeText={(start) => setDates((value) => ({ ...value, start }))}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label={t('trip.endDate')}
            value={dates.end}
            onChangeText={(end) => setDates((value) => ({ ...value, end }))}
            placeholder="YYYY-MM-DD"
          />
        </View>
      )}
      {step === 3 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.subtitle, { color: c.onSurface }]}>{t('trip.trekQuestion')}</Text>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>{t('trip.trekBody')}</Text>
          <Button
            label={trek ? t('trip.trekOn') : t('trip.trekOff')}
            variant={trek ? 'primary' : 'secondary'}
            onPress={() => setTrek((value) => !value)}
          />
        </View>
      )}
      {step === 4 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.subtitle, { color: c.onSurface }]}>{t('trip.contacts')}</Text>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>
            {contacts.length > 0 
              ? `${contacts.map(c => c.name).join(' and ')} will receive an escalation only if you miss two check-ins or trigger an SOS. They cannot see your location history.`
              : 'You have no emergency contacts to notify.'}
          </Text>
          {contactsLoading ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : contacts.length > 0 ? (
            contacts.map(contact => (
              <Button
                key={contact.id}
                label={`${contact.name} is my emergency contact`}
                variant="secondary"
                onPress={() => {
                  setToastMessage(`${contact.name} will be notified only during an escalation.`);
                  setToast(true);
                }}
              />
            ))
          ) : (
            <View style={{ gap: space.sm }}>
              <Text style={[type.body, { color: c.onSurfaceVariant }]}>
                You don't have any emergency contacts set up yet. It is highly recommended to add one before starting a trip.
              </Text>
              <Button
                label="Add Emergency Contact"
                variant="secondary"
                onPress={() => router.push('/settings/contacts')}
              />
            </View>
          )}
        </View>
      )}
      {step === 5 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.subtitle, { color: c.onSurface }]}>{t('trip.tierTitle')}</Text>
          <TierSelector value={tier} onChange={setTier} />
        </View>
      )}
      {step === 6 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.title, { color: c.onSurface }]}>{t('trip.reviewTitle')}</Text>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>
            {destination} · {dates.start} to {dates.end}
          </Text>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>
            {t('trip.monitoring', { tier: t(`tiers.${tier}.title`) })}
          </Text>
          <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
            {t('trip.zonePackNote')}
          </Text>
        </View>
      )}
      {primer ? (
        <PermissionPrimer
          tier={tier}
          loading={permissionBusy}
          notice={permissionNotice}
          onBack={() => {
            setPermissionNotice(undefined);
            setPrimer(false);
          }}
          onContinue={() => void requestPermissionsAndStart()}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              label={t('common.back')}
              variant="ghost"
              disabled={step === 1 || permissionBusy}
              onPress={() => setStep((value) => Math.max(1, value - 1))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={step === 6 ? t('trip.start') : t('common.continue')}
              loading={permissionBusy}
              disabled={permissionBusy}
              onPress={proceed}
            />
          </View>
        </View>
      )}
      <Toast
        visible={toast}
        message={step === 4 ? toastMessage : t('trip.toastCreated')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  datePickerHeader: {
    padding: space.sm,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapContainer: { height: 350, borderRadius: 16, overflow: 'hidden', backgroundColor: '#e2e2e2' },
  map: { flex: 1 },
  mapCrosshair: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  crosshairDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#1F6F54', borderWidth: 3, borderColor: '#fff', elevation: 5 },
  pin: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#fff' }
});
