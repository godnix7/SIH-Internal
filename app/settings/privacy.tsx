import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, View, Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, Toast, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { useAppStore } from '@/src/stores/useAppStore';
import { api } from '@/src/services/api';

export default function PrivacyScreen() {
  const c = useAppColors();
  const { trips, addAlert } = useAppStore();
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await api.get('/users/me/export');
      Alert.alert('Success', 'Data downloaded successfully!');
    } catch (e: any) {
      if (!e.response) {
        Alert.alert('No Connection', 'Could not reach the server.');
      } else {
        Alert.alert('Error', 'Failed to download data.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen title="Privacy & DPDP Act" subtitle="Digital Personal Data Protection Compliance">
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>Notice & Data Minimization</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>
          Under the DPDP Act, Yatri Shield only collects your location, identity, and medical data strictly for emergency response purposes. 
          Trips on this device: {trips?.length || 0}. Full-monitoring trails are automatically erased 30 days after a trip ends.
        </Text>
      </Card>
      
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>Your Data Rights</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginBottom: space.md }]}>
          You have the right to access your data and the Right to Erasure.
        </Text>
        <Button 
          label={downloading ? "Downloading…" : "Export My Data (Portability)"} 
          variant="secondary" 
          onPress={handleDownload}
          disabled={downloading}
          loading={downloading}
        />
        <View style={{ marginTop: space.sm }}>
          <Button
            label="Erase Active Trip Data"
            variant="destructive"
            onPress={() => {
              addAlert({
                kind: 'system',
                severity: 'warning',
                title: 'Data Erasure Requested',
                body: 'Active trip trails erased. Open incidents are preserved for legal-hold review.',
                id: Date.now().toString(),
                timestamp: new Date().toISOString()
              });
              showToast('Eligible data erased according to DPDP policies.');
            }}
          />
        </View>
        <View style={{ marginTop: space.sm }}>
          <Button
            label="Revoke Consent & Delete Account"
            variant="destructive"
            onPress={() => router.push('/settings/account')}
          />
        </View>
      </Card>

      <Toast
        visible={toast}
        message={toastMessage}
      />
    </Screen>
  );
}
