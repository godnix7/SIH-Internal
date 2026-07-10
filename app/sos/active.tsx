import { useEffect, useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';

import { MapZoneLayer } from '@/src/components/MapZoneLayer';
import { Screen } from '@/src/components/Screen';
import { Button, Card, OfflineBar, PinPad, TimelineItem, useAppColors } from '@/src/components/ui';
import {
  DEMO_CANCEL_PIN,
  DEMO_SHORTCODE,
  EMERGENCY_NUMBER,
  OFFLINE_RETRY_MS,
} from '@/src/lib/constants';
import { integrityKey, useChainIntegrity } from '@/src/lib/useChainIntegrity';
import { flushOutbox } from '@/src/services/api';
import { activeTrip, useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function SosActiveScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const { sos, trips, incidentEvents, setSosStatus, sendSos, cancelSos, resolveSos } =
    useAppStore();
  const [pin, setPin] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState<number | undefined>();
  const trip = activeTrip(trips);
  const integrity = useChainIntegrity(incidentEvents);
  const secondsLeft = useMemo(
    () =>
      sos?.status === 'COUNTDOWN'
        ? Math.max(0, 5 - Math.floor(((now ?? sos.createdAt) - sos.createdAt) / 1000))
        : 0,
    [now, sos],
  );
  useEffect(() => {
    if (!sos) {
      router.replace('/shield');
      return;
    }
    if (sos.status !== 'COUNTDOWN') return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [sos]);
  useEffect(() => {
    if (sos?.status === 'COUNTDOWN' && secondsLeft === 0) void sendSos();
  }, [secondsLeft, sendSos, sos?.status]);
  // Backs the "trying every 10 s" promise shown on the offline card.
  useEffect(() => {
    if (sos?.status !== 'OFFLINE_QUEUED') return;
    const timer = setInterval(() => {
      void flushOutbox().then(({ sentTypes }) => {
        if (sentTypes.includes('sos.triggered')) void setSosStatus('SENT');
      });
    }, OFFLINE_RETRY_MS);
    return () => clearInterval(timer);
  }, [setSosStatus, sos?.status]);
  if (!sos) return null;
  if (sos.status === 'COUNTDOWN')
    return (
      <Screen scroll={false}>
        <View
          style={{
            flex: 1,
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: space.xxl,
          }}
        >
          <View style={{ gap: space.xs, alignItems: 'center' }}>
            <ShieldAlert color={c.signal} size={34} />
            <Text style={[type.title, { color: c.ink }]}>{t('sos.sending')}</Text>
            <Text style={[type.body, { color: c.slate, textAlign: 'center' }]}>
              {t('sos.sendingBody')}
            </Text>
          </View>
          <Text style={[type.display, { color: c.signal, fontSize: 110, lineHeight: 120 }]}>
            {secondsLeft}
          </Text>
          <Button label={t('sos.cancel')} variant="secondary" onPress={() => setCancelOpen(true)} />
          {cancelOpen && (
            <Card>
              <PinPad value={pin} onChange={setPin} />
              <Text style={[type.caption, { color: c.slate }]}>
                {t('sos.pinHint', { pin: DEMO_CANCEL_PIN })}
              </Text>
              <Button
                label={t('sos.cancelButton')}
                variant="destructive"
                onPress={() => void cancelSos(pin).then((ok) => ok && router.replace('/shield'))}
              />
            </Card>
          )}
        </View>
      </Screen>
    );
  const offline = sos.status === 'OFFLINE_QUEUED';
  const statusText = t(`sos.statuses.${sos.status}`, { defaultValue: sos.status });
  const sms = `SOS ${sos.id} ${sos.location ? `${sos.location.latitude.toFixed(4)},${sos.location.longitude.toFixed(4)} ±${Math.round(sos.location.accuracy)}m` : 'last location unavailable'} ${new Date(sos.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <Screen
      title={sos.silent ? t('sos.decoyTitle') : t('sos.activeTitle')}
      subtitle={sos.silent ? t('sos.decoySub') : t('sos.statusLine', { status: statusText })}
    >
      <Card>
        <Text style={[type.heading, { color: c.signal }]}>
          {sos.status === 'RESPONDER_ENROUTE'
            ? t('sos.enroute')
            : sos.status === 'ACKNOWLEDGED'
              ? t('sos.acknowledged')
              : t('sos.delivering')}
        </Text>
        <Text style={[type.body, { color: c.slate }]}>{t('sos.sharedLine')}</Text>
      </Card>
      {offline && (
        <View style={{ gap: space.sm }}>
          <OfflineBar />
          <Card>
            <Text style={[type.body, { color: c.ink }]}>{t('sos.offlineCard')}</Text>
            <Button
              label={t('sos.openSms', { code: DEMO_SHORTCODE })}
              variant="secondary"
              onPress={() =>
                void Linking.openURL(`sms:${DEMO_SHORTCODE}?body=${encodeURIComponent(sms)}`)
              }
            />
          </Card>
        </View>
      )}
      <MapZoneLayer zones={trip?.zones ?? []} location={sos.location} showTrail />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label={t('sos.call')}
            variant="secondary"
            onPress={() => void Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
            accessibilityHint={t('sos.callHint')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t('sos.updateStatus')}
            variant="ghost"
            onPress={() => void setSosStatus('ACKNOWLEDGED')}
          />
        </View>
      </View>
      <Card>
        <Text style={[type.heading, { color: c.ink }]}>{t('sos.timeline')}</Text>
        {incidentEvents.map((event) => (
          <TimelineItem key={event.id} event={event} />
        ))}
        <Text style={[type.caption, { color: integrity === 'broken' ? c.signal : c.slate }]}>
          {t(integrityKey(integrity), { count: incidentEvents.length })}
        </Text>
      </Card>
      {['SENT', 'ACKNOWLEDGED', 'RESPONDER_ENROUTE'].includes(sos.status) && (
        <Button
          label={t('sos.cancelWithPin')}
          variant="ghost"
          onPress={() => setCancelOpen((value) => !value)}
        />
      )}
      {cancelOpen && (
        <Card>
          <PinPad value={pin} onChange={setPin} />
          <Button
            label={t('sos.cancelButton')}
            variant="destructive"
            onPress={() =>
              void cancelSos(pin).then((ok) => {
                if (ok) router.replace('/shield');
              })
            }
          />
        </Card>
      )}
      {sos.status === 'RESPONDER_ENROUTE' && (
        <Button
          label={t('sos.resolve')}
          variant="secondary"
          onPress={() => void resolveSos().then(() => router.replace('/home'))}
        />
      )}
    </Screen>
  );
}
