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
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState(false);
  const { setHasSetPin } = useAppStore();

  const handleNext = async () => {
    if (step === 'enter') {
      if (pin.length === 4) {
        setStep('confirm');
        setError(false);
      }
    } else {
      if (pin === confirmPin) {
        await storage.setDevicePin(pin);
        setHasSetPin(true);
        router.replace('/home');
      } else {
        setError(true);
        setConfirmPin('');
      }
    }
  };

  return (
    <Screen
      title="Secure this device"
      subtitle={
        step === 'enter'
          ? 'Set a 4-digit PIN to securely cancel any SOS alerts from this device.'
          : 'Please confirm your 4-digit PIN.'
      }
    >
      <View style={{ alignItems: 'center', marginTop: space.xl }}>
        <PinPad
          length={4}
          value={step === 'enter' ? pin : confirmPin}
          onChange={(val) => {
            if (step === 'enter') setPin(val);
            else {
              setConfirmPin(val);
              setError(false);
            }
          }}
          error={error}
        />
        {error && (
          <Text style={[type.caption, { color: c.critical, marginTop: space.sm }]}>
            PINs do not match. Please try again.
          </Text>
        )}
      </View>
      <View style={{ marginTop: space.xxxl }}>
        <Button
          label={step === 'enter' ? 'Next' : 'Save PIN'}
          disabled={(step === 'enter' ? pin.length : confirmPin.length) !== 4}
          onPress={handleNext}
        />
      </View>
    </Screen>
  );
}
