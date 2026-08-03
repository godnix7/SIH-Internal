import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View, Alert } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Input, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { useAppStore } from '@/src/stores/useAppStore';
import { api } from '@/src/services/api';

export default function Kyc() {
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('India');
  const [city, setCity] = useState('');
  const [method, setMethod] = useState<'aadhaar' | 'passport'>('aadhaar');
  const save = useAppStore((state) => state.saveProfile);
  const c = useAppColors();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (loading) return;
    try {
      setLoading(true);
      // The backend expects specific payload structures for KYC validation
      const payload =
        method === 'aadhaar'
          ? { type: 'aadhaar', digilockerToken: JSON.stringify({ name, dob: '1990-01-01' }) }
          : { type: 'passport', mrzData: JSON.stringify({ name, dob: '1990-01-01' }) };

      await api.post('/identity/verify', payload);

      save({ name, nationality, homeCity: city });
      router.push('/success');
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert(
          'No Connection',
          'Could not reach the verification server. Please check your internet connection and try again.',
        );
      } else if (e.response.status === 422) {
        Alert.alert(
          'Verification Failed',
          'The document details could not be verified. Please check your information and try again.',
        );
      } else {
        Alert.alert(
          'Verification Error',
          'Something went wrong during verification. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Make your Tourist ID"
      subtitle="Choose Aadhaar through DigiLocker or passport capture."
    >
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Aadhaar"
            variant={method === 'aadhaar' ? 'primary' : 'secondary'}
            onPress={() => setMethod('aadhaar')}
            disabled={loading}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Passport"
            variant={method === 'passport' ? 'primary' : 'secondary'}
            onPress={() => setMethod('passport')}
            disabled={loading}
          />
        </View>
      </View>
      <Input
        label="Name as on your document"
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
      />
      <Input
        label="Nationality"
        value={nationality}
        onChangeText={setNationality}
        placeholder="Enter nationality"
      />
      <Input
        label="Home city"
        value={city}
        onChangeText={setCity}
        placeholder="Enter your home city"
      />
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
        {method === 'aadhaar'
          ? 'DigiLocker verification takes about two seconds.'
          : 'Passport frame capture takes about two seconds.'}{' '}
        Medical details remain self-declared.
      </Text>
      <Button
        label={loading ? 'Verifying…' : 'Verify and issue ID'}
        disabled={!name || !city || loading}
        loading={loading}
        onPress={handleVerify}
      />
    </Screen>
  );
}
