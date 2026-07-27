import { useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, Platform, Alert, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, OTPInput, useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';
import { api } from '@/src/services/api';
import { storage } from '@/src/lib/storage';
import { useAppStore } from '@/src/stores/useAppStore';

export default function OTP() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const c = useAppColors();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAppStore();

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendCode = useCallback(async () => {
    if (resending || resendTimer > 0) return;
    setResending(true);
    try {
      await api.post('/auth/register', { phone });
      setResendTimer(60); // Reset to 60 seconds after resend
      Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
    } catch (e: any) {
      if (e.response?.status === 429) {
        Alert.alert('Please Wait', 'Too many requests. Please wait before requesting another code.');
      } else if (!e.response) {
        Alert.alert('No Connection', 'Could not reach the server. Please check your internet connection.');
      } else {
        Alert.alert('Error', 'Failed to resend code. Please try again.');
      }
    } finally {
      setResending(false);
    }
  }, [phone, resending, resendTimer]);

  const handleVerify = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await api.post('/auth/verify-otp', {
        phone,
        otp: code,
        deviceFingerprint: `device-${Platform.OS}`,
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
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert('No Connection', 'Could not reach the server. Please check your internet connection and try again.');
      } else if (e.response.status === 401) {
        const detail = e.response.data?.detail || e.response.data?.error?.message;
        if (detail === 'INVALID_OTP') {
          Alert.alert('Invalid Code', 'The code you entered is incorrect. Please check the SMS and try again.');
        } else {
          Alert.alert('Expired Code', 'This code has expired. Please request a new one.');
        }
        setCode('');
      } else if (e.response.status === 429) {
        Alert.alert('Too Many Attempts', 'You have exceeded the maximum number of verification attempts. Please wait and try again.');
      } else {
        Alert.alert('Verification Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Enter the code" subtitle="We sent a 6-digit code to your mobile number.">
      <OTPInput value={code} onChange={setCode} />
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {resendTimer > 0 ? (
          <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
            You can request another code in {resendTimer} seconds.
          </Text>
        ) : (
          <Button
            label={resending ? "Sending…" : "Resend Code"}
            variant="ghost"
            onPress={handleResendCode}
            disabled={resending}
          />
        )}
      </View>

      <Button
        label={loading ? 'Verifying…' : 'Verify and continue'}
        disabled={code.length !== 6 || loading}
        loading={loading}
        onPress={handleVerify}
      />
    </Screen>
  );
}
