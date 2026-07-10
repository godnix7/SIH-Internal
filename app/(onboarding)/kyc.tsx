import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Input, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { useAppStore } from '@/src/stores/useAppStore';

export default function Kyc() {
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('India');
  const [city, setCity] = useState('');
  const [method, setMethod] = useState<'aadhaar' | 'passport'>('aadhaar');
  const save = useAppStore((state) => state.saveProfile);
  const c = useAppColors();
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
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Passport"
            variant={method === 'passport' ? 'primary' : 'secondary'}
            onPress={() => setMethod('passport')}
          />
        </View>
      </View>
      <Input
        label="Name as on your document"
        value={name}
        onChangeText={setName}
        placeholder="Ananya Sharma"
      />
      <Input
        label="Nationality"
        value={nationality}
        onChangeText={setNationality}
        placeholder="India"
      />
      <Input label="Home city" value={city} onChangeText={setCity} placeholder="Bengaluru" />
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
        {method === 'aadhaar'
          ? 'DigiLocker verification takes about two seconds.'
          : 'Passport frame capture takes about two seconds.'}{' '}
        Medical details remain self-declared.
      </Text>
      <Button
        label="Verify and issue ID"
        disabled={!name || !city}
        onPress={() => {
          save({ name, nationality, homeCity: city });
          router.push('/success');
        }}
      />
    </Screen>
  );
}
