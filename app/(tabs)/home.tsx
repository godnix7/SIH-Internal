import { router } from 'expo-router';
import { MapPin, ShieldCheck, Umbrella } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
import { activeTrip, isSosActive, useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function HomeScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const { profile, trips, online, sos, addAlert } = useAppStore();
  const trip = activeTrip(trips);
  const state = isSosActive(sos)
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
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>{t('home.greeting')}</Text>
        <Text style={[type.display, { color: c.onSurface }]}>
          {profile?.name?.split(' ')[0] ?? t('home.fallbackName')}
        </Text>
        <MonitoringStatusPill state={state} onPress={() => router.push('/settings/privacy')} />
      </View>
      {!online && <OfflineBar />}
      {trip ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.subtitle, { color: c.onSurface }]}>{trip.destination}</Text>
              <Text style={[type.body, { color: c.onSurfaceVariant }]}>
                {t('home.protectedWith', { tier: t(`tiers.${trip.tier}.title`) })}
              </Text>
              <Button
                label={t('common.imOk')}
                onPress={() =>
                  addAlert({
                    kind: 'checkin',
                    severity: 'info',
                    title: t('home.checkInTitle'),
                    body: t('home.checkInBody'),
                  })
                }
              />
            </View>
            <CheckInCountdown target={trip.nextCheckInAt} />
          </View>
        </Card>
      ) : (
        <EmptyState
          title={t('home.emptyTitle')}
          body={t('home.emptyBody')}
          action={<Button label={t('common.planTrip')} onPress={() => router.push('/trip/new')} />}
        />
      )}
      <View style={{ gap: space.xs }}>
        <Text style={[type.title, { color: c.onSurface }]}>{t('home.nearby')}</Text>
        <Card>
          <ListRow
            icon={<MapPin color={c.primary} />}
            title={t('home.policeAidPost')}
            sub={t('home.policeAidPostSub')}
            onPress={() =>
              addAlert({
                kind: 'system',
                severity: 'info',
                title: t('home.aidSavedTitle'),
                body: t('home.aidSavedBody'),
              })
            }
          />
          <ListRow
            icon={<ShieldCheck color={c.warning} />}
            title={t('home.areaAdvisory')}
            sub={t('home.areaAdvisorySub')}
            onPress={() => router.push('/alerts')}
          />
        </Card>
      </View>
      <Card>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Umbrella color={c.primary} />
          <View>
            <Text style={[type.subtitle, { color: c.onSurface }]}>{t('home.weatherTitle')}</Text>
            <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
              {t('home.weatherSub')}
            </Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}
