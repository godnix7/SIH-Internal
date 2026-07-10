import { router } from 'expo-router';
import { MapPin, ShieldCheck, Umbrella } from 'lucide-react-native';
import { Text, View } from 'react-native';
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
import { activeTrip, useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function HomeScreen() {
  const c = useAppColors();
  const { profile, trips, online, sos, addAlert } = useAppStore();
  const trip = activeTrip(trips);
  const state = sos
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
        <Text style={[type.caption, { color: c.slate }]}>Good morning</Text>
        <Text style={[type.display, { color: c.ink }]}>
          {profile?.name?.split(' ')[0] ?? 'Traveller'}
        </Text>
        <MonitoringStatusPill state={state} onPress={() => router.push('/settings/privacy')} />
      </View>
      {!online && <OfflineBar />}
      {trip ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.heading, { color: c.ink }]}>{trip.destination}</Text>
              <Text style={[type.body, { color: c.slate }]}>
                Protected with{' '}
                {trip.tier === 'checkins' ? 'check-ins only' : trip.tier.replaceAll('s', ' ')}
              </Text>
              <Button
                label="I’m OK"
                onPress={() =>
                  addAlert({
                    kind: 'checkin',
                    severity: 'info',
                    title: 'Check-in received',
                    body: 'You are marked OK. Your next check-in is scheduled automatically.',
                  })
                }
              />
            </View>
            <CheckInCountdown target={trip.nextCheckInAt} />
          </View>
        </Card>
      ) : (
        <EmptyState
          title="Plan your next trip"
          body="Set your destination, dates and the monitoring tier that feels right for you."
          action={<Button label="Plan a trip" onPress={() => router.push('/trip/new')} />}
        />
      )}
      <View style={{ gap: space.xs }}>
        <Text style={[type.title, { color: c.ink }]}>Nearby right now</Text>
        <Card>
          <ListRow
            icon={<MapPin color={c.sky} />}
            title="Police aid post"
            sub="MI Road help desk · 400 m away"
            onPress={() =>
              addAlert({
                kind: 'system',
                severity: 'info',
                title: 'Aid post saved',
                body: 'MI Road help desk has been added to your local trip notes.',
              })
            }
          />
          <ListRow
            icon={<ShieldCheck color={c.amber} />}
            title="Area advisory"
            sub="Keep valuables zipped around busy markets after dark."
            onPress={() => router.push('/alerts')}
          />
        </Card>
      </View>
      <Card>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Umbrella color={c.sky} />
          <View>
            <Text style={[type.heading, { color: c.ink }]}>Light rain later</Text>
            <Text style={[type.caption, { color: c.slate }]}>
              Demo forecast · carry a light layer for the evening.
            </Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}
