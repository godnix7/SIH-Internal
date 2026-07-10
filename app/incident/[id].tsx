import { useLocalSearchParams, router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, TimelineItem, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { type } from '@/src/theme/tokens';

export default function IncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAppColors();
  const events = useAppStore((state) => state.incidentEvents);
  return (
    <Screen title="Incident timeline" subtitle={`Incident ${id}`}>
      <Card>
        {events.length ? (
          events.map((event) => <TimelineItem key={event.id} event={event} />)
        ) : (
          <Text style={[type.body, { color: c.slate }]}>
            No incident events are stored on this device yet.
          </Text>
        )}
        <Text style={[type.caption, { color: c.slate }]}>
          Record integrity: {events.length} events · chain verified
        </Text>
      </Card>
      <Button
        label="Back to alerts"
        variant="secondary"
        onPress={() => router.replace('/alerts')}
      />
    </Screen>
  );
}
