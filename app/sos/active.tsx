import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';

import { MapZoneLayer } from '@/src/components/MapZoneLayer';
import { Screen } from '@/src/components/Screen';
import { Button, Card, OfflineBar, PinPad, TimelineItem, useAppColors } from '@/src/components/ui';
import {
  SMS_SHORTCODE,
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
  const [cancelling, setCancelling] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [pinError, setPinError] = useState(false);
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

  // Handle cancel with PIN — with error feedback
  const handleCancelWithPin = async () => {
    if (cancelling) return;
    setCancelling(true);
    setPinError(false);
    try {
      const ok = await cancelSos(pin);
      if (ok) {
        router.replace('/shield');
      } else {
        setPinError(true);
        setPin('');
      }
    } catch {
      Alert.alert('Error', 'Failed to cancel SOS. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Handle resolve with confirmation
  const handleResolve = () => {
    Alert.alert(
      'Resolve Emergency',
      'Are you sure the emergency is resolved? This will end the active SOS and stop emergency tracking.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            setResolving(true);
            try {
              await resolveSos();
              router.replace('/home');
            } catch {
              Alert.alert('Error', 'Failed to resolve SOS. Please try again or call 112.');
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  };

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
            <ShieldAlert color={c.critical} size={34} />
            <Text style={[type.title, { color: c.onSurface }]}>{t('sos.sending')}</Text>
            <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
              {t('sos.sendingBody')}
            </Text>
          </View>
          <Text style={[type.display, { color: c.critical, fontSize: 110, lineHeight: 120 }]}>
            {secondsLeft}
          </Text>
          <Button label={t('sos.cancel')} variant="secondary" onPress={() => setCancelOpen(true)} />
          {cancelOpen && (
            <Card>
              <PinPad value={pin} onChange={(val) => { setPin(val); setPinError(false); }} />
              {pinError && (
                <Text style={[type.caption, { color: c.critical }]}>
                  Incorrect PIN. Please try again.
                </Text>
              )}
              <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                Enter your 4-digit security PIN to cancel
              </Text>
              <Button
                label={cancelling ? 'Cancelling…' : t('sos.cancelButton')}
                variant="destructive"
                disabled={cancelling || pin.length < 4}
                onPress={handleCancelWithPin}
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
        <Text style={[type.subtitle, { color: c.critical }]}>
          {sos.status === 'RESPONDER_ENROUTE'
            ? t('sos.enroute')
            : sos.status === 'ACKNOWLEDGED'
              ? t('sos.acknowledged')
              : t('sos.delivering')}
        </Text>
        <Text style={[type.body, { color: c.onSurfaceVariant }]}>{t('sos.sharedLine')}</Text>
      </Card>
      {offline && (
        <View style={{ gap: space.sm }}>
          <OfflineBar />
          <Card>
            <Text style={[type.body, { color: c.onSurface }]}>{t('sos.offlineCard')}</Text>
            <Button
              label={t('sos.openSms', { code: SMS_SHORTCODE })}
              variant="secondary"
              onPress={() =>
                void Linking.openURL(`sms:${SMS_SHORTCODE}?body=${encodeURIComponent(sms)}`)
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
        {/* Removed debug "Update Status" button — status should only come from the operator */}
      </View>
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>{t('sos.timeline')}</Text>
        {incidentEvents.map((event) => (
          <TimelineItem key={event.id} event={event} />
        ))}
        <Text
          style={[
            type.caption,
            { color: integrity === 'broken' ? c.critical : c.onSurfaceVariant },
          ]}
        >
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
          <PinPad value={pin} onChange={(val) => { setPin(val); setPinError(false); }} />
          {pinError && (
            <Text style={[type.caption, { color: c.critical }]}>
              Incorrect PIN. Please try again.
            </Text>
          )}
          <Button
            label={cancelling ? 'Cancelling…' : t('sos.cancelButton')}
            variant="destructive"
            disabled={cancelling || pin.length < 4}
            onPress={handleCancelWithPin}
          />
        </Card>
      )}
      {sos.status === 'RESPONDER_ENROUTE' && (
        <Button
          label={resolving ? 'Resolving…' : t('sos.resolve')}
          variant="secondary"
          disabled={resolving}
          loading={resolving}
          onPress={handleResolve}
        />
      )}
    </Screen>
  );
}
