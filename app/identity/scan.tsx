import { useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button, Card, Input, useAppColors } from '@/src/components/ui';
import { type } from '@/src/theme/tokens';

export default function ScanIdentity() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manual, setManual] = useState('YS-2026-DEMO');
  const c = useAppColors();
  const showCard = scanned || manual.length > 5;
  return (
    <Screen
      title="Responder demo"
      subtitle="Camera access is used only to read a QR in this local demo."
    >
      {!permission?.granted ? (
        <Card>
          <Text style={[type.body, { color: c.ink }]}>
            Allow camera access to scan a Digital Tourist ID.
          </Text>
          <Button label="Allow camera" onPress={() => void requestPermission()} />
        </Card>
      ) : (
        <View style={{ height: 280, overflow: 'hidden', borderRadius: 12 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={() => setScanned(true)}
          />
        </View>
      )}
      <Input
        label="Or enter ID reference"
        value={manual}
        onChangeText={setManual}
        placeholder="YS-2026-1234"
      />
      {showCard && (
        <Card>
          <Text style={[type.heading, { color: c.trail }]}>Verified demo card</Text>
          <Text style={[type.title, { color: c.ink }]}>Ananya Sharma</Text>
          <Text style={[type.body, { color: c.slate }]}>
            YS-2026-1234 · Self-declared medical card available during an active incident.
          </Text>
          <Text style={[type.caption, { color: c.slate }]}>
            Access logged locally at{' '}
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
          </Text>
        </Card>
      )}
      <Button label="Return to my ID" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
