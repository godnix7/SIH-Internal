import { router, useLocalSearchParams } from 'expo-router';
import { Text, View, Alert, Share } from 'react-native';

import { MapZoneLayer } from '@/src/components/MapZoneLayer';
import { Screen } from '@/src/components/Screen';
import {
  Button,
  Card,
  CheckInCountdown,
  MonitoringStatusPill,
  TierSelector,
  Toast,
  useAppColors,
} from '@/src/components/ui';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/src/stores/useAppStore';
import { api } from '@/src/services/api';
import { stopMonitoring } from '@/src/services/monitoring';
import { space, type } from '@/src/theme/tokens';
import { useLocationEngine } from '@/src/services/locationEngine';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAppColors();
  const trip = useAppStore((state) => state.trips.find((item) => item.id === id));
  const updateTier = useAppStore((state) => state.updateTripTier);
  const endTrip = useAppStore((state) => state.endTrip);
  const addAlert = useAppStore((state) => state.addAlert);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Your trip remains in your control.');
  const [riskData, setRiskData] = useState<{ total_score: number; events: any[] } | null>(null);
  const [endingTrip, setEndingTrip] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [changingTier, setChangingTier] = useState(false);
  const engineState = useLocationEngine();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  useEffect(() => {
    if (trip) {
      api
        .get(`/risk/trip/${trip.id}/events`)
        .then((res) => setRiskData(res.data))
        .catch(() => {
          /* Risk data is optional — don't block the screen */
        });
    }
  }, [trip]);

  // Handle check-in with API call
  const handleCheckIn = async () => {
    if (checkingIn || !trip) return;
    setCheckingIn(true);
    try {
      await api.post(`/trips/${trip.id}/checkin`);
      addAlert({
        kind: 'checkin',
        severity: 'info',
        title: 'Check-in received',
        body: 'You are marked OK. We kept your tier unchanged.',
      });
      showToast('Check-in confirmed.');
    } catch {
      // Check-in is non-critical — show feedback but don't alarm
      addAlert({
        kind: 'checkin',
        severity: 'info',
        title: 'Check-in received locally',
        body: 'The server could not be reached, but your check-in is recorded locally.',
      });
      showToast('Check-in saved locally.');
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle pause with feedback
  const handlePause = async () => {
    if (pausing || !trip) return;
    setPausing(true);
    try {
      await api.post(`/trips/${trip.id}/pause`, { durationMinutes: 60 });
    } catch {
      // Pause is best-effort
    }
    useAppStore.getState().pauseTrip(trip.id);
    addAlert({
      kind: 'system',
      severity: 'warning',
      title: 'Monitoring paused for one hour',
      body: 'It will resume automatically. Your SOS remains available.',
    });
    showToast('Monitoring paused for 1 hour.');
    setPausing(false);
  };

  // Handle resume with feedback
  const handleResume = async () => {
    if (resuming || !trip) return;
    setResuming(true);
    try {
      await api.post(`/trips/${trip.id}/resume`);
    } catch {
      // Resume is best-effort
    }
    useAppStore.getState().resumeTrip(trip.id);
    addAlert({
      kind: 'system',
      severity: 'info',
      title: 'Monitoring resumed',
      body: 'Your trip monitoring is active again.',
    });
    showToast('Monitoring resumed.');
    setResuming(false);
  };
  // Handle tier change with loading
  const handleTierChange = async (tier: any) => {
    if (!trip || changingTier) return;
    setChangingTier(true);
    try {
      await updateTier(trip.id, tier);
      showToast('Monitoring tier updated.');
    } catch {
      Alert.alert('Error', 'Failed to update monitoring tier. Please try again.');
    } finally {
      setChangingTier(false);
    }
  };

  // Handle end trip with confirmation
  const handleEndTrip = () => {
    if (!trip) return;
    Alert.alert(
      'End Trip',
      `Are you sure you want to end your trip to ${trip.destination}? Monitoring will stop and location tracking will be disabled for this trip.`,
      [
        { text: 'Keep Trip Active', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            setEndingTrip(true);
            try {
              await stopMonitoring();
              await endTrip(trip.id);
              router.replace('/trips');
            } catch {
              Alert.alert('Error', 'Failed to end trip. Please try again.');
            } finally {
              setEndingTrip(false);
            }
          },
        },
      ],
    );
  };

  if (!trip)
    return (
      <Screen title="Trip not found" subtitle="This trip may have been deleted from the device.">
        <Button label="Back to trips" onPress={() => router.replace('/trips')} />
      </Screen>
    );

  return (
    <Screen title={trip.destination} subtitle={`${trip.startDate} to ${trip.endDate}`}>
      <MonitoringStatusPill
        state={trip.status === 'paused' ? 'paused' : trip.monitoringLimited ? 'limited' : 'live'}
      />
      
      {trip.status === 'active' && engineState.mode === 'HIGH_RISK' && (
        <Card style={{ backgroundColor: c.errorContainer, borderColor: c.error, borderWidth: 1 }}>
          <Text style={[type.subtitle, { color: c.critical }]}>⚠️ DANGER ZONE</Text>
          <Text style={[type.body, { color: c.onSurface, marginTop: 4 }]}>
            You have entered a high-risk geofence. Police have been notified of your location. Please proceed with extreme caution or evacuate.
          </Text>
        </Card>
      )}

      <MapZoneLayer zones={trip.zones} showTrail />

      {riskData && riskData.events.length > 0 && (
        <Card
          style={{ backgroundColor: riskData.total_score >= 75 ? c.errorContainer : c.surface }}
        >
          <Text
            style={[
              type.subtitle,
              { color: riskData.total_score >= 75 ? c.critical : c.onSurface },
            ]}
          >
            {riskData.total_score >= 75 ? '⚠️ CHALLENGE PROTOCOL ACTIVE' : 'Active Risk Factors'}
          </Text>
          {riskData.events.map((e, idx) => (
            <Text key={idx} style={[type.body, { color: c.onSurfaceVariant, marginTop: 4 }]}>
              • {e.factor.replace(/_/g, ' ')} (+{e.points} pts)
            </Text>
          ))}
          <Text style={[type.caption, { color: c.onSurfaceVariant, marginTop: 8 }]}>
            Total Score: {riskData.total_score}/100
          </Text>
        </Card>
      )}

      <Card>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View>
            <Text style={[type.subtitle, { color: c.onSurface }]}>Your next check-in</Text>
            <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
              We ask before escalating to a contact.
            </Text>
          </View>
          <CheckInCountdown target={trip.nextCheckInAt} paused={trip.status === 'paused'} />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label={checkingIn ? 'Checking in…' : "I'm OK"}
            onPress={handleCheckIn}
            disabled={checkingIn}
            loading={checkingIn}
          />
        </View>
        <View style={{ flex: 1 }}>
          {trip.status === 'paused' ? (
            <Button
              label={resuming ? 'Resuming…' : 'Resume'}
              variant="primary"
              onPress={handleResume}
              disabled={resuming}
              loading={resuming}
            />
          ) : (
            <Button
              label={pausing ? 'Pausing…' : 'Pause 1 h'}
              variant="secondary"
              onPress={handlePause}
              disabled={pausing}
              loading={pausing}
            />
          )}
        </View>
      </View>
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>Change monitoring for this trip</Text>
        <TierSelector value={trip.tier} onChange={handleTierChange} />
        {changingTier && (
          <Text style={[type.caption, { color: c.primary, marginTop: 4 }]}>
            Updating monitoring tier…
          </Text>
        )}
      </Card>
      <Button
        label={endingTrip ? 'Ending trip…' : 'End trip'}
        variant="destructive"
        onPress={handleEndTrip}
        disabled={endingTrip}
        loading={endingTrip}
      />
      <Toast visible={toast} message={toastMessage} />
    </Screen>
  );
}
