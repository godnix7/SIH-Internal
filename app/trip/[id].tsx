import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { MapZoneLayer } from '@/src/components/MapZoneLayer';
import { Screen } from '@/src/components/Screen';
import {
  Button,
  Card,
  CheckInCountdown,
  MonitoringStatusPill,
  TierSelector,
  Toast,
  useAppColors,
} from '@/src/components/ui';
import { useState } from 'react';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAppColors();
  const trip = useAppStore((state) => state.trips.find((item) => item.id === id));
  const updateTier = useAppStore((state) => state.updateTripTier);
  const endTrip = useAppStore((state) => state.endTrip);
  const addAlert = useAppStore((state) => state.addAlert);
  const [toast, setToast] = useState(false);
  if (!trip)
    return (
      <Screen title="Trip not found" subtitle="This trip may have been deleted from the device.">
        <Button label="Back to trips" onPress={() => router.replace('/trips')} />
      </Screen>
    );
  return (
    <Screen title={trip.destination} subtitle={`${trip.startDate} to ${trip.endDate}`}>
      <MonitoringStatusPill
        state={trip.status === 'paused' ? 'paused' : trip.monitoringLimited ? 'limited' : 'live'}
      />
      <MapZoneLayer zones={trip.zones} showTrail />
      <Card>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View>
            <Text style={[type.heading, { color: c.ink }]}>Your next check-in</Text>
            <Text style={[type.caption, { color: c.slate }]}>
              We ask before escalating to a contact.
            </Text>
          </View>
          <CheckInCountdown target={trip.nextCheckInAt} />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="I’m OK"
            onPress={() => {
              addAlert({
                kind: 'checkin',
                severity: 'info',
                title: 'Check-in received',
                body: 'You are marked OK. We kept your tier unchanged.',
              });
              setToast(true);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Pause 1 h"
            variant="secondary"
            onPress={() => {
              addAlert({
                kind: 'system',
                severity: 'warning',
                title: 'Monitoring paused for one hour',
                body: 'It will resume automatically. Your SOS remains available.',
              });
              setToast(true);
            }}
          />
        </View>
      </View>
      <Button
        label="Share live link"
        variant="ghost"
        onPress={() => {
          addAlert({
            kind: 'system',
            severity: 'info',
            title: 'Demo live link prepared',
            body: 'In a production build this opens your system share sheet with a revocable link.',
          });
          setToast(true);
        }}
      />
      <Card>
        <Text style={[type.heading, { color: c.ink }]}>Change monitoring for this trip</Text>
        <TierSelector
          value={trip.tier}
          onChange={(tier) => void updateTier(trip.id, tier).then(() => setToast(true))}
        />
      </Card>
      <Button
        label="End trip"
        variant="destructive"
        onPress={() => {
          endTrip(trip.id);
          router.replace('/trips');
        }}
      />
      <Toast visible={toast} message="Your trip remains in your control." />
    </Screen>
  );
}
