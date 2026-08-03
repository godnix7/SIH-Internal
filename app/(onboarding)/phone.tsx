import { useState } from 'react';
import { router } from 'expo-router';
import { Text, Alert, View, TouchableOpacity, Platform } from 'react-native';
import { CheckSquare, Square, Eye, EyeOff } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Input, useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';
import { api } from '@/src/services/api';
import { storage } from '@/src/lib/storage';
import { useAppStore } from '@/src/stores/useAppStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dpdpConsent, setDpdpConsent] = useState(false);
  const c = useAppColors();
  const { login } = useAppStore();

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = validEmail && password.length >= 8 && dpdpConsent;

  const handleLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
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
        const pin = await storage.getDevicePin();
        if (!pin) {
          router.replace('/(onboarding)/pin' as any);
          return;
        }
        const complete = useAppStore.getState().hasCompletedOnboarding;
        if (complete) {
          router.replace('/');
        } else {
          router.replace('/offline-maps' as any);
        }
      }
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert(
          'No Connection',
          'Could not reach the server. Please check your internet connection and try again.',
        );
      } else if (e.response.status === 401) {
        const detail = e.response.data?.detail || '';
        if (detail === 'ACCOUNT_SUSPENDED') {
          Alert.alert(
            'Account Suspended',
            'Your account has been suspended. Please contact support.',
          );
        } else {
          Alert.alert(
            'Invalid Credentials',
            'The email or password you entered is incorrect. Please try again.',
          );
        }
      } else if (e.response.status === 429) {
        Alert.alert('Too Many Attempts', 'Please wait a moment before trying again.');
      } else {
        Alert.alert('Login Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Welcome back" subtitle="Sign in with your email and password to continue.">
      <Input
        label="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
      />

      <View>
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="Enter your password"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: 12,
            top: 38,
            padding: 4,
          }}
          activeOpacity={0.7}
        >
          {showPassword ? (
            <EyeOff color={c.onSurfaceVariant} size={20} />
          ) : (
            <Eye color={c.onSurfaceVariant} size={20} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: space.sm,
          marginBottom: space.md,
          gap: space.sm,
        }}
        onPress={() => setDpdpConsent(!dpdpConsent)}
        activeOpacity={0.7}
      >
        {dpdpConsent ? (
          <CheckSquare color={c.primary} size={24} />
        ) : (
          <Square color={c.onSurfaceVariant} size={24} />
        )}
        <Text style={[type.caption, { color: c.onSurfaceVariant, flex: 1 }]}>
          I consent to the collection of my location and identity data strictly for emergency
          response purposes in accordance with the DPDP Act.
        </Text>
      </TouchableOpacity>

      <Button
        label={loading ? 'Signing in…' : 'Sign In'}
        disabled={!valid || loading}
        loading={loading}
        onPress={handleLogin}
      />

      <TouchableOpacity
        onPress={() => router.push('/signup' as any)}
        style={{ alignItems: 'center', marginTop: space.lg }}
        activeOpacity={0.7}
      >
        <Text style={[type.body, { color: c.primary }]}>
          Don't have an account? <Text style={{ fontWeight: '600' }}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
