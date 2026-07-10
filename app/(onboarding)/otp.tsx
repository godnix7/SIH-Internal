import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, OTPInput, useAppColors } from '@/src/components/ui';
import { type } from '@/src/theme/tokens';

export default function OTP() {
  const [code, setCode] = useState('');
  const c = useAppColors();
  return (
    <Screen title="Enter the code" subtitle="We sent a 6-digit code. In demo mode, use 000000.">
      <OTPInput value={code} onChange={setCode} />
      <Text style={[type.caption, { color: c.slate }]}>
        You can request another code in 30 seconds.
      </Text>
      <Button
        label="Verify and continue"
        disabled={code.length !== 6}
        onPress={() => router.push('/kyc')}
      />
    </Screen>
  );
}
