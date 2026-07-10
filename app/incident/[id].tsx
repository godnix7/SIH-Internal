import { useLocalSearchParams, router } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { Button, Card, TimelineItem, useAppColors } from '@/src/components/ui';
import { integrityKey, useChainIntegrity } from '@/src/lib/useChainIntegrity';
import { useAppStore } from '@/src/stores/useAppStore';
import { type } from '@/src/theme/tokens';

export default function IncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAppColors();
  const { t } = useTranslation();
  const events = useAppStore((state) => state.incidentEvents);
  const integrity = useChainIntegrity(events);
  return (
    <Screen title={t('sos.timeline')} subtitle={`Incident ${id}`}>
      <Card>
        {events.length ? (
          events.map((event) => <TimelineItem key={event.id} event={event} />)
        ) : (
          <Text style={[type.body, { color: c.slate }]}>{t('sos.noEvents')}</Text>
        )}
        <Text style={[type.caption, { color: integrity === 'broken' ? c.signal : c.slate }]}>
          {t('sos.integrityRecord', {
            summary: t(integrityKey(integrity), { count: events.length }),
          })}
        </Text>
      </Card>
      <Button
        label={t('sos.backToAlerts')}
        variant="secondary"
        onPress={() => router.replace('/alerts')}
      />
    </Screen>
  );
}
