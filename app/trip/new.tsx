import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

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
    setPermissionNotice('Waiting for your Android permission choice…');
    try {
      const permissions = await requestTripPermissions(tier);
      const needsBackgroundLocation = tier === 'zones' || tier === 'full';
      const monitoringLimited =
        needsBackgroundLocation && (!permissions.foreground || !permissions.background);
      const trip = await createTrip({
        destination,
        startDate: dates.start,
        endDate: dates.end,
        tier,
        trek: trek ? 'Sahastra Tal' : undefined,
        partySize: trek ? 4 : 1,
        monitoringLimited,
      });

      if (!monitoringLimited) {
        try {
          await startMonitoring(trip);
        } catch {
          addAlert({
            kind: 'system',
            severity: 'warning',
            title: 'Monitoring needs attention',
            body: 'Your trip is active, but background monitoring could not start. Check Android location settings before relying on it.',
          });
        }
      }
      if (monitoringLimited) {
        addAlert({
          kind: 'system',
          severity: 'warning',
          title: 'Background location is off',
          body: 'Your trip is active with check-ins, but zone or trail monitoring pauses when the app is closed. Enable background location in Android Settings to restore it.',
        });
      } else if (!permissions.notifications) {
        addAlert({
          kind: 'system',
          severity: 'warning',
          title: 'Notifications are off',
          body: 'Your trip is active, but check-in reminders will not appear until notifications are enabled in Android Settings.',
        });
      }
      setToast(true);
      setTimeout(() => router.replace(`/trip/${trip.id}`), 650);
    } catch {
      setPermissionNotice(
        'Android could not complete the permission request. Your trip has not started—please try again or choose Check-ins only.',
      );
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
    <Screen
      title="Plan a trip"
      subtitle={`Step ${step} of 6 · your choice stays editable after the trip starts.`}
    >
      {step === 1 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.heading, { color: c.ink }]}>Destination</Text>
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
            label="Start date"
            value={dates.start}
            onChangeText={(start) => setDates((value) => ({ ...value, start }))}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="End date"
            value={dates.end}
            onChangeText={(end) => setDates((value) => ({ ...value, end }))}
            placeholder="YYYY-MM-DD"
          />
        </View>
      )}
      {step === 3 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.heading, { color: c.ink }]}>Is this a trek?</Text>
          <Text style={[type.body, { color: c.slate }]}>
            Trek trips include a route-corridor zone pack and checkpoint reminders.
          </Text>
          <Button
            label={trek ? 'Trek route: Sahastra Tal' : 'Make this a trek'}
            variant={trek ? 'primary' : 'secondary'}
            onPress={() => setTrek((value) => !value)}
          />
        </View>
      )}
      {step === 4 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.heading, { color: c.ink }]}>Emergency contacts</Text>
          <Text style={[type.body, { color: c.slate }]}>
            Ananya (sister) will receive an escalation only if you miss two check-ins or trigger an
            SOS. She cannot see your location history.
          </Text>
          <Button
            label="Ananya is my emergency contact"
            variant="secondary"
            onPress={() => setToast(true)}
          />
        </View>
      )}
      {step === 5 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.heading, { color: c.ink }]}>Choose your monitoring tier</Text>
          <TierSelector value={tier} onChange={setTier} />
        </View>
      )}
      {step === 6 && (
        <View style={{ gap: space.sm }}>
          <Text style={[type.title, { color: c.ink }]}>Ready to protect this trip</Text>
          <Text style={[type.body, { color: c.slate }]}>
            {destination} · {dates.start} to {dates.end}
          </Text>
          <Text style={[type.body, { color: c.slate }]}>
            Monitoring: {tier === 'checkins' ? 'Check-ins only' : tier}
          </Text>
          <Text style={[type.caption, { color: c.slate }]}>
            Your zone pack downloads locally. A missing zone pack is shown as unavailable; it never
            silently changes your consent choice.
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
              label="Back"
              variant="ghost"
              disabled={step === 1 || permissionBusy}
              onPress={() => setStep((value) => Math.max(1, value - 1))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={step === 6 ? 'Start protecting this trip' : 'Continue'}
              loading={permissionBusy}
              disabled={permissionBusy}
              onPress={proceed}
            />
          </View>
        </View>
      )}
      <Toast
        visible={toast}
        message={
          step === 4
            ? 'Ananya will be notified only during an escalation.'
            : 'Your trip is set up locally.'
        }
      />
    </Screen>
  );
}
