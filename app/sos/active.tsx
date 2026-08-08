import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ShieldAlert, Bot } from 'lucide-react-native';
import { connectRealtime } from '@/src/services/realtime';
import { locationEngine } from '@/src/services/locationEngine';

import { MapZoneLayer } from '@/src/components/MapZoneLayer';
import { Screen } from '@/src/components/Screen';
import { Button, Card, OfflineBar, PinPad, TimelineItem, useAppColors } from '@/src/components/ui';
import { SMS_SHORTCODE, EMERGENCY_NUMBER, OFFLINE_RETRY_MS } from '@/src/lib/constants';
import { integrityKey, useChainIntegrity } from '@/src/lib/useChainIntegrity';
import { flushOutbox } from '@/src/services/api';
import { activeTrip, useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function SosActiveScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const { sos, trips, incidentEvents, zones } = useAppStore();
  const [pin, setPin] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const setSosStatus = useAppStore((state) => state.setSosStatus);
  const sendSos = useAppStore((state) => state.sendSos);
  const cancelSos = useAppStore((state) => state.cancelSos);
  const resolutionOtp = useAppStore((state) => state.resolutionOtp);
  const resolveSos = useAppStore((state) => state.resolveSos);
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
      router.replace('/home');
      return;
    }
    // Auto-navigate away when SOS reaches a terminal state via server push
    if (
      sos.status === 'FALSE_ALARM' ||
      sos.status === 'RESOLVED' ||
      sos.status === 'CANCELLED' ||
      sos.status === 'CANCELLED_BY_USER'
    ) {
      const title =
        sos.status === 'CANCELLED_BY_USER' || sos.status === 'CANCELLED'
          ? 'SOS Cancelled'
          : 'Incident Closed';
      const label =
        sos.status === 'FALSE_ALARM'
          ? 'The control room has closed this incident as a false alarm.'
          : sos.status === 'RESOLVED'
            ? 'This emergency has been resolved and confirmed by the responding officer via OTP verification.'
            : 'You have successfully cancelled the SOS alert using your Safe PIN. Emergency tracking has stopped.';
      Alert.alert(title, label, [{ text: 'OK', onPress: () => router.replace('/home') }]);
      // Only call resolveSos/clearSos for server-driven terminal states
      if (sos.status !== 'CANCELLED_BY_USER' && sos.status !== 'CANCELLED') {
        if (sos.status === 'FALSE_ALARM') {
          void useAppStore.getState().clearSos();
        } else {
          void resolveSos();
        }
      }
      return;
    }
    if (sos.status !== 'COUNTDOWN') return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [sos, sos?.status]);
  useEffect(() => {
    if (sos?.status === 'COUNTDOWN' && secondsLeft === 0) void sendSos();
  }, [secondsLeft, sendSos, sos?.status]);
  // Realtime updates (like getting the OTP)
  useEffect(() => {
    if (!sos || sos.status === 'COUNTDOWN' || sos.status === 'OFFLINE_QUEUED') return;

    let socket: ReturnType<typeof connectRealtime> | undefined;
    import('@/src/lib/storage').then(({ storage }) => {
      storage.getAccessToken().then((token) => {
        if (!token) return;
        socket = connectRealtime(token, (update) => {
          if (update.id === sos.incidentId) {
            const state = useAppStore.getState();
            state.setSosStatus(update.status.toUpperCase() as any, update.otp);
          }
        });
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [sos?.id, sos?.incidentId]);

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

  // Handle cancel with PIN — directly validate and cancel (PIN entry is the confirmation)
  const handleCancelWithPin = async () => {
    if (cancelling) return;
    setCancelling(true);
    setPinError(false);
    try {
      const ok = await cancelSos(pin);
      if (ok) {
        Alert.alert(
          'SOS Cancelled',
          'You have successfully cancelled the SOS alert using your Safe PIN. Emergency tracking has stopped.',
          [{ text: 'OK' }],
        );
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
      ],
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
              <PinPad
                value={pin}
                onChange={(val) => {
                  setPin(val);
                  setPinError(false);
                }}
              />
              {pinError && (
                <Text style={[type.caption, { color: c.critical }]}>
                  Incorrect PIN. Please try again.
                </Text>
              )}
              <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                Enter your 4-digit security PIN to cancel
              </Text>
              <Button
                label={cancelling ? 'Cancelling…' : 'Cancel'}
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
      hideBack
      title={sos.silent ? t('sos.decoyTitle') : t('sos.activeTitle')}
      subtitle={sos.silent ? t('sos.decoySub') : t('sos.statusLine', { status: statusText })}
    >
      <Card>
        <Text style={[type.subtitle, { color: c.critical }]}>
          {sos.status === 'FALSE_ALARM'
            ? 'This incident has been closed as a false alarm by the control room.'
            : sos.status === 'RESPONDER_ENROUTE'
              ? t('sos.enroute')
              : sos.status === 'RESPONDER_ARRIVED'
                ? 'Police/Medical team has arrived at your location'
                : sos.status === 'RESOLVE_PENDING'
                  ? 'Incident clearing pending'
                  : sos.status === 'ACKNOWLEDGED'
                    ? t('sos.acknowledged')
                    : t('sos.delivering')}
        </Text>
        <Text style={[type.body, { color: c.onSurfaceVariant }]}>{t('sos.sharedLine')}</Text>
      </Card>

      {/* Real-Time Edge AI Conversational Assistant Card */}
      <View
        style={{
          backgroundColor: '#1E293B',
          borderRadius: 16,
          padding: 18,
          borderWidth: 1.5,
          borderColor: '#38BDF8',
          shadowColor: '#38BDF8',
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 6,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#38BDF8',
            }}
          >
            <Bot size={22} color="#38BDF8" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                Edge AI Rescue Companion
              </Text>
              <View
                style={{
                  backgroundColor: '#059669',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '900' }}>REAL-TIME</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              Intelligent triage & trauma assistance while rescue is enroute
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 20 }}>
          Don’t panic while waiting for emergency units. Talk to our real-time conversational Edge
          AI to get custom first-aid instructions, monitor vital symptoms, and manage your immediate
          environment.
        </Text>

        <Button
          label="💬 Talk to Real-Time Edge AI"
          variant="primary"
          onPress={() => router.push('/emergency-ai' as any)}
        />
      </View>

      {sos.status === 'RESOLVE_PENDING' && resolutionOtp && (
        <Card>
          <Text style={[type.subtitle, { color: c.primary, fontWeight: 'bold', fontSize: 18 }]}>
            🔒 Security Clearance OTP (6-Digit)
          </Text>
          <Text
            style={[type.body, { color: c.onSurfaceVariant, marginBottom: 12, lineHeight: 22 }]}
          >
            An authorized police unit or emergency responder has requested to resolve this incident.
            Please read them this high-security 6-digit verification code to confirm your safety:
          </Text>
          <View
            style={{
              backgroundColor: c.surfaceVariant,
              paddingVertical: 20,
              paddingHorizontal: 24,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: c.primary,
              alignItems: 'center',
              shadowColor: c.primary,
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 36,
                fontWeight: '900',
                letterSpacing: 10,
                color: c.primary,
                fontFamily: 'monospace',
              }}
            >
              {resolutionOtp}
            </Text>
            <Text
              style={{ fontSize: 12, color: c.onSurfaceVariant, marginTop: 8, fontWeight: '600' }}
            >
              ✓ SHA-256 Synchronized with Police Command Portal
            </Text>
          </View>
        </Card>
      )}

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
      <MapZoneLayer
        zones={zones && zones.length > 0 ? zones : (trip?.zones ?? [])}
        location={sos.location}
        showTrail
      />

      {sos.nearestFacility && (
        <Card>
          <Text style={[type.subtitle, { color: c.onSurface }]}>Nearest Safe Facility</Text>

          {sos.nearestFacility.expiresAt && Date.now() > sos.nearestFacility.expiresAt && (
            <Text style={[type.caption, { color: c.warning, marginBottom: 4, fontWeight: 'bold' }]}>
              STALE: Previously known hospital. Information may be outdated.
            </Text>
          )}

          {sos.healthcareRoute?.routeType === 'offline_straight_line' ? (
            <Text style={[type.body, { color: c.onSurfaceVariant }]}>
              {sos.nearestFacility.name} - Approximate straight-line distance:{' '}
              {Math.round((sos.nearestFacility.distanceMeter || 0) / 1000)}km
            </Text>
          ) : (
            <Text style={[type.body, { color: c.onSurfaceVariant }]}>
              {sos.nearestFacility.name} -{' '}
              {Math.round((sos.nearestFacility.distanceMeter || 0) / 1000)}km
            </Text>
          )}

          {sos.healthcareRoute?.safe === false && (
            <Text style={[type.caption, { color: c.critical, marginTop: 4, fontWeight: 'bold' }]}>
              {sos.healthcareRoute.warnings?.[0]}
            </Text>
          )}

          <View style={{ marginTop: 8 }}>
            <Button
              label="Get Directions"
              variant="secondary"
              onPress={() =>
                void Linking.openURL(
                  `geo:${sos.nearestFacility?.location.lat},${sos.nearestFacility?.location.lon}?q=${sos.nearestFacility?.location.lat},${sos.nearestFacility?.location.lon}(${encodeURIComponent(sos.nearestFacility?.name || 'Healthcare')})`,
                )
              }
            />
          </View>
        </Card>
      )}

      {offline && !sos.nearestFacility && (
        <Card>
          <Text style={[type.subtitle, { color: c.onSurface }]}>Nearest Safe Facility</Text>
          <Text style={[type.caption, { color: c.warning, marginTop: 4, fontWeight: 'bold' }]}>
            Current healthcare facilities could not be verified because the device is offline.
          </Text>
        </Card>
      )}

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
      {[
        'SENT',
        'ACKNOWLEDGED',
        'RESPONDER_ENROUTE',
        'RESPONDER_ARRIVED',
        'RESOLVE_PENDING',
      ].includes(sos.status) &&
        sos.status !== 'FALSE_ALARM' && (
          <Button
            label={t('sos.cancelWithPin', { defaultValue: 'Cancel SOS with Safe PIN' })}
            variant="ghost"
            onPress={() => setCancelOpen((value) => !value)}
          />
        )}
      {cancelOpen && (
        <Card>
          <PinPad
            value={pin}
            onChange={(val) => {
              setPin(val);
              setPinError(false);
            }}
          />
          {pinError && (
            <Text style={[type.caption, { color: c.critical }]}>
              Incorrect PIN. Please try again.
            </Text>
          )}
          <Button
            label={cancelling ? 'Cancelling…' : 'Cancel'}
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
