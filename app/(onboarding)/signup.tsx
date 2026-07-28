import { useState } from 'react';
import { router } from 'expo-router';
import { Text, Alert, View, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { CheckSquare, Square, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Input, useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';
import { api } from '@/src/services/api';
import { storage } from '@/src/lib/storage';
import { useAppStore } from '@/src/stores/useAppStore';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dpdpConsent, setDpdpConsent] = useState(false);
  const c = useAppColors();
  const { login } = useAppStore();

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validPhone = phone.replace(/\D/g, '').length >= 10;
  const passwordsMatch = password === confirmPassword && password.length >= 8;
  const valid = validEmail && validPhone && passwordsMatch && dpdpConsent;

  const handleSignup = async () => {
    if (loading) return;

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/signup', {
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ''),
        password,
        confirmPassword,
      });

      const { accessToken, refreshToken, sosToken, userId } = res.data;

      await storage.setTokens(accessToken, refreshToken, sosToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      login(userId);

      // New users go to KYC
      router.push('/kyc');
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert(
          'No Connection',
          'Could not reach the server. Please check your internet connection and try again.'
        );
      } else if (e.response.status === 409) {
        Alert.alert(
          'Email Already Registered',
          'An account with this email already exists. Please sign in instead.'
        );
      } else if (e.response.status === 422) {
        const details = e.response.data?.error?.details;
        if (details && Array.isArray(details)) {
          const messages = details.map((d: any) => d.issue || d.msg).join('\n');
          Alert.alert('Validation Error', messages);
        } else {
          Alert.alert(
            'Validation Error',
            'Please check your information and try again.'
          );
        }
      } else if (e.response.status === 429) {
        Alert.alert(
          'Too Many Attempts',
          'Please wait a moment before trying again.'
        );
      } else {
        Alert.alert('Signup Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Create your account"
      subtitle="Sign up to start your safe travel experience."
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          marginBottom: space.md,
        }}
        activeOpacity={0.7}
      >
        <ArrowLeft color={c.primary} size={20} />
        <Text style={[type.body, { color: c.primary, fontWeight: '600' }]}>
          Back to Sign In
        </Text>
      </TouchableOpacity>

      <Input
        label="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
      />

      <Input
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
      />

      <View>
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="Minimum 8 characters"
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

      <View>
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          placeholder="Re-enter your password"
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={{
            position: 'absolute',
            right: 12,
            top: 38,
            padding: 4,
          }}
          activeOpacity={0.7}
        >
          {showConfirmPassword ? (
            <EyeOff color={c.onSurfaceVariant} size={20} />
          ) : (
            <Eye color={c.onSurfaceVariant} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword && (
        <Text style={[type.caption, { color: c.error || '#EF4444' }]}>
          Passwords do not match.
        </Text>
      )}

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
          I consent to the collection of my location and identity data strictly
          for emergency response purposes in accordance with the DPDP Act.
        </Text>
      </TouchableOpacity>

      <Button
        label={loading ? 'Creating account…' : 'Create Account'}
        disabled={!valid || loading}
        loading={loading}
        onPress={handleSignup}
      />

      <TouchableOpacity
        onPress={() => router.back()}
        style={{ alignItems: 'center', marginTop: space.lg }}
        activeOpacity={0.7}
      >
        <Text style={[type.body, { color: c.primary }]}>
          Already have an account? <Text style={{ fontWeight: '600' }}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
