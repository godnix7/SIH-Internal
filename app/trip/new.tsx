import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
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

const destinations = [
  'Jaipur, Rajasthan',
  'Gangtok, Sikkim',
  'Sahastra Tal, Uttarakhand',
  'Triund, Himachal Pradesh',
  'Shillong, Meghalaya',
];

export default function NewTrip() {
  const c = useAppColors();
  const { t } = useTranslation();
  const createTrip = useAppStore((state) => state.createTrip);
  const addAlert = useAppStore((state) => state.addAlert);
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState(destinations[0]);
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
    if (step < 6) setStep((value) => value + 1);
    else if (tier === 'zones' || tier === 'full') setPrimer(true);
    else void requestPermissionsAndStart();
  };
  return (
    <Screen title={t('trip.title')} subtitle={t('trip.step', { step })}>
      {step === 1 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.subtitle, { color: c.onSurface }]}>{t('trip.destination')}</Text>
          {destinations.map((item) => (
            <Button
              key={item}
              label={item}
              variant={destination === item ? 'primary' : 'secondary'}
              onPress={() => setDestination(item)}
            />
          ))}
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
