import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, Platform } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, OTPInput, useAppColors } from '@/src/components/ui';
import { type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';
import { storage } from '@/src/lib/storage';
import { useAppStore } from '@/src/stores/useAppStore';

export default function OTP() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const c = useAppColors();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAppStore();

  const handleVerify = async () => {
    try {
      setLoading(true);
      const res = await api.post('/auth/verify-otp', {
        phone,
        otp: code,
        deviceFingerprint: `device-demo-${Platform.OS}`, // Demo placeholder
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      const { accessToken, refreshToken, sosToken, userId, isNewUser } = res.data;

      await storage.setTokens(accessToken, refreshToken, sosToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      login(userId);

      if (isNewUser) {
        router.push('/kyc');
      } else {
        router.replace('/');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Enter the code" subtitle="We sent a 6-digit code. In demo mode, use 123456.">
      <OTPInput value={code} onChange={setCode} />
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
        You can request another code in 30 seconds.
      </Text>
      <Button
        label={loading ? 'Verifying...' : 'Verify and continue'}
        disabled={code.length !== 6 || loading}
        onPress={handleVerify}
      />
    </Screen>
  );
}
