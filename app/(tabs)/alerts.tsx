import { router } from 'expo-router';
import { BellRing, MapPinned, ShieldAlert } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Card, EmptyState, ListRow, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function AlertsScreen() {
  const alerts = useAppStore((state) => state.alerts);
  const c = useAppColors();
  return (
    <Screen
      title="Alerts"
      subtitle="A local, reverse-chronological record of safety events and notices."
    >
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        <Text style={[type.caption, { color: c.trail }]}>All</Text>
        <Text style={[type.caption, { color: c.slate }]}>Zones</Text>
        <Text style={[type.caption, { color: c.slate }]}>Check-ins</Text>
        <Text style={[type.caption, { color: c.slate }]}>Incidents</Text>
      </View>
      {alerts.length ? (
        <Card>
          {alerts.map((alert) => (
            <ListRow
              key={alert.id}
              icon={
                alert.severity === 'critical' ? (
                  <ShieldAlert color={c.signal} />
                ) : alert.kind === 'zone' ? (
                  <MapPinned color={c.amber} />
                ) : (
                  <BellRing color={c.sky} />
                )
              }
              title={alert.title}
              sub={alert.body}
              onPress={() =>
                alert.kind === 'incident' ? router.push('/incident/current') : undefined
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          title="Nothing needs your attention"
          body="Zone notices, check-ins and incident updates will appear here."
        />
      )}
    </Screen>
  );
}
