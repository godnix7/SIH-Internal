import { useEffect, useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';

import { MapZoneLayer } from '@/src/components/MapZoneLayer';
import { Screen } from '@/src/components/Screen';
import { Button, Card, OfflineBar, PinPad, TimelineItem, useAppColors } from '@/src/components/ui';
import { DEMO_SHORTCODE, EMERGENCY_NUMBER } from '@/src/lib/constants';
import { activeTrip, useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function SosActiveScreen() {
  const c = useAppColors();
  const { sos, trips, incidentEvents, setSosStatus, sendSos, cancelSos, resolveSos } =
    useAppStore();
  const [pin, setPin] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState<number | undefined>();
  const trip = activeTrip(trips);
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
            <Text style={[type.title, { color: c.ink }]}>Sending SOS</Text>
            <Text style={[type.body, { color: c.slate, textAlign: 'center' }]}>
              We will send your selected SOS with your last known location.
            </Text>
          </View>
          <Text style={[type.display, { color: c.signal, fontSize: 110, lineHeight: 120 }]}>
            {secondsLeft}
          </Text>
          <Button
            label="I’m safe — cancel"
            variant="secondary"
            onPress={() => setCancelOpen(true)}
          />
          {cancelOpen && (
            <Card>
              <PinPad value={pin} onChange={setPin} />
              <Text style={[type.caption, { color: c.slate }]}>
                Enter the cancellation PIN set in this demo: 1122.
              </Text>
              <Button
                label="Cancel SOS"
                variant="destructive"
                onPress={() => void cancelSos(pin).then((ok) => ok && router.replace('/shield'))}
              />
            </Card>
          )}
        </View>
      </Screen>
    );
  const offline = sos.status === 'OFFLINE_QUEUED';
  const statusText = sos.status.replaceAll('_', ' ');
  const sms = `SOS ${sos.id} ${sos.location ? `${sos.location.latitude.toFixed(4)},${sos.location.longitude.toFixed(4)} ±${Math.round(sos.location.accuracy)}m` : 'last location unavailable'} ${new Date(sos.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <Screen
      title={sos.silent ? 'Weather update' : 'SOS active'}
      subtitle={sos.silent ? 'Chance of rain later today' : `Status: ${statusText}`}
    >
      <Card>
        <Text style={[type.heading, { color: c.signal }]}>
          {sos.status === 'RESPONDER_ENROUTE'
            ? 'Responder unit UK-12 is on the way'
            : sos.status === 'ACKNOWLEDGED'
              ? 'Seen by SI Dorjee at the control room'
              : 'Your SOS is being delivered'}
        </Text>
        <Text style={[type.body, { color: c.slate }]}>
          Your identity, location and self-declared medical card are shared for this incident only.
        </Text>
      </Card>
      {offline && (
        <View style={{ gap: space.sm }}>
          <OfflineBar />
          <Card>
            <Text style={[type.body, { color: c.ink }]}>
              No network — SOS saved. Trying every 10 s. Send by SMS instead?
            </Text>
            <Button
              label={`Open SMS to ${DEMO_SHORTCODE}`}
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
            label="Call 112"
            variant="secondary"
            onPress={() => void Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
            accessibilityHint="Opens your phone's emergency calling screen"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Update status"
            variant="ghost"
            onPress={() => void setSosStatus('ACKNOWLEDGED')}
          />
        </View>
      </View>
      <Card>
        <Text style={[type.heading, { color: c.ink }]}>Incident timeline</Text>
        {incidentEvents.map((event) => (
          <TimelineItem key={event.id} event={event} />
        ))}
        <Text style={[type.caption, { color: c.slate }]}>
          {incidentEvents.length} events · chain verified
        </Text>
      </Card>
      {['SENT', 'ACKNOWLEDGED', 'RESPONDER_ENROUTE'].includes(sos.status) && (
        <Button
          label="I’m safe — cancel with PIN"
          variant="ghost"
          onPress={() => setCancelOpen((value) => !value)}
        />
      )}
      {cancelOpen && (
        <Card>
          <PinPad value={pin} onChange={setPin} />
          <Button
            label="Cancel SOS"
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
          label="Mark incident resolved"
          variant="secondary"
          onPress={() => void resolveSos().then(() => router.replace('/home'))}
        />
      )}
    </Screen>
  );
}
