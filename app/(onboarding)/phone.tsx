import { useState } from 'react';
import { router } from 'expo-router';
import { Text, Alert, View, TouchableOpacity } from 'react-native';
import { CheckSquare, Square } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Input, useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function Phone() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [dpdpConsent, setDpdpConsent] = useState(false);
  const c = useAppColors();
  const valid = phone.replace(/\D/g, '').length >= 10 && dpdpConsent;

  const handleSendCode = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const normalizedPhone = phone.replace(/\D/g, '');
      await api.post('/auth/register', { phone: normalizedPhone });
      router.push({ pathname: '/otp', params: { phone: normalizedPhone } });
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert('No Connection', 'Could not reach the server. Please check your internet connection and try again.');
      } else if (e.response.status === 429) {
        Alert.alert('Too Many Attempts', 'Please wait 60 seconds before requesting another code.');
      } else {
        Alert.alert('Failed to Send Code', 'Something went wrong. Please try again.');
      }
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

      <TouchableOpacity 
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.sm, marginBottom: space.md, gap: space.sm }}
        onPress={() => setDpdpConsent(!dpdpConsent)}
        activeOpacity={0.7}
      >
        {dpdpConsent ? (
          <CheckSquare color={c.primary} size={24} />
        ) : (
          <Square color={c.onSurfaceVariant} size={24} />
        )}
        <Text style={[type.caption, { color: c.onSurfaceVariant, flex: 1 }]}>
          I consent to the collection of my location and identity data strictly for emergency response purposes in accordance with the DPDP Act.
        </Text>
      </TouchableOpacity>

      <Button
        label={loading ? 'Sending…' : 'Send code'}
        disabled={!valid || loading}
        loading={loading}
        onPress={handleSendCode}
      />
    </Screen>
  );
}
