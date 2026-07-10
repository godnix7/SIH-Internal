import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Input, useAppColors } from '@/src/components/ui';
import { type } from '@/src/theme/tokens';

export default function Phone() {
  const [phone, setPhone] = useState('');
  const c = useAppColors();
  const valid = phone.replace(/\D/g, '').length >= 10;
  return (
    <Screen
      title="Your phone, for this trip"
      subtitle="We use it to sign in and keep your emergency contact details current."
    >
      <Input
        label="Mobile number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
      />
      <Text style={[type.caption, { color: c.slate }]}>
        In demo mode, any number works. The verification code is 000000.
      </Text>
      <Button label="Send code" disabled={!valid} onPress={() => router.push('/otp')} />
    </Screen>
  );
}
