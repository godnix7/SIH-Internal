import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Input, useAppColors } from '@/src/components/ui';
import { type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function Phone() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const c = useAppColors();
  const valid = phone.replace(/\D/g, '').length >= 10;

  const handleSendCode = async () => {
    try {
      setLoading(true);
      await api.post('/auth/register', { phone });
      router.push({ pathname: '/otp', params: { phone } });
    } catch (e) {
      console.error(e);
      alert('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
        In demo mode, any number works. The verification code is 123456.
      </Text>
      <Button
        label={loading ? 'Sending...' : 'Send code'}
        disabled={!valid || loading}
        onPress={handleSendCode}
      />
    </Screen>
  );
}
