import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

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
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';



export default function NewTrip() {
  const c = useAppColors();
  const { t } = useTranslation();
  const createTrip = useAppStore((state) => state.createTrip);
  const addAlert = useAppStore((state) => state.addAlert);
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState({ start: '2026-07-12', end: '2026-07-16' });
  const [trek, setTrek] = useState(false);
  const [tier, setTier] = useState<ConsentTier>('checkins');
  const [primer, setPrimer] = useState(false);
  const [toast, setToast] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string>();

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
  const proceed = () => {
    if (step === 1 && destination.trim().length === 0) {
      Alert.alert('Destination Required', 'Please enter your destination to continue.');
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
          <Text style={[type.subtitle, { color: c.onSurface }]}>{t('trip.destination')}</Text>
          <Input
            label="Where are you heading?"
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Manali, Himachal Pradesh"
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
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>{t('trip.contactsBody')}</Text>
          <Button
            label={t('trip.contactsConfirm')}
            variant="secondary"
            onPress={() => setToast(true)}
          />
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
        message={step === 4 ? t('trip.toastContacts') : t('trip.toastCreated')}
      />
    </Screen>
  );
}
