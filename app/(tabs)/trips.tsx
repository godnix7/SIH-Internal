import { router } from 'expo-router';
import { CalendarDays, MapPinned } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, EmptyState, ListRow, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';

export default function TripsScreen() {
  const trips = useAppStore((state) => state.trips);
  const c = useAppColors();
  return (
    <Screen title="Trips" subtitle="Every trip keeps its own consent choice and local zone pack.">
      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          body="Your first trip takes less than a minute to set up in demo mode."
          action={<Button label="Create a trip" onPress={() => router.push('/trip/new')} />}
        />
      ) : (
        <Card>
          {trips.map((trip) => (
            <ListRow
              key={trip.id}
              icon={<MapPinned color={c.primary} />}
              title={trip.destination}
              sub={`${trip.startDate} to ${trip.endDate} · ${trip.status}`}
              onPress={() => router.push(`/trip/${trip.id}`)}
              trailing={<CalendarDays color={c.onSurfaceVariant} size={20} />}
            />
          ))}
        </Card>
      )}
      <Button
        label="Create another trip"
        variant="secondary"
        onPress={() => router.push('/trip/new')}
      />
    </Screen>
  );
}
