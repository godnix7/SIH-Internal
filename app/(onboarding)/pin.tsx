import { useState } from 'react';
import { router } from 'expo-router';
import { View, Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, PinPad, useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';
import { storage } from '@/src/lib/storage';
import { useAppStore } from '@/src/stores/useAppStore';

export default function PinSetupScreen() {
  const c = useAppColors();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const { setHasSetPin } = useAppStore();

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (pin !== confirmPin) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      await storage.setDevicePin(pin);
      setHasSetPin(true);

      const state = useAppStore.getState();
      if (!state.hasCompletedOnboarding) {
        router.replace('/(onboarding)/offline-maps' as any);
      } else {
        router.replace('/(tabs)/home' as any);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Secure this device"
      subtitle="Set a 4-digit PIN to securely cancel any SOS alerts from this device."
    >
      <View style={{ gap: space.xl, marginTop: space.lg }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.md }]}>
            Enter PIN
          </Text>
          <PinPad
            length={4}
            value={pin}
            onChange={(val) => {
              setPin(val);
              setError(false);
            }}
          />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.md }]}>
            Confirm PIN
          </Text>
          <PinPad
            length={4}
            value={confirmPin}
            onChange={(val) => {
              setConfirmPin(val);
              setError(false);
            }}
            error={error}
          />
          {error && (
            <Text style={[type.caption, { color: c.critical, marginTop: space.sm }]}>
              PINs do not match. Please try again.
            </Text>
          )}
        </View>
      </View>

      <View style={{ marginTop: space.xxl }}>
        <Button
          label="Save PIN"
          disabled={pin.length !== 4 || confirmPin.length !== 4 || saving}
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}
