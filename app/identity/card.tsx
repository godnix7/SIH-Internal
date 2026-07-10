import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function IdentityCard() {
  const profile = useAppStore((state) => state.profile);
  const c = useAppColors();
  const payload = JSON.stringify({
    v: 1,
    id: profile?.idRef ?? 'YS-2026-DEMO',
    name: profile?.name ?? 'Demo traveller',
    status: 'demo-verified',
  });
  return (
    <Screen
      title="Digital Tourist ID"
      subtitle="A signed demo credential. It is not a government identity document."
    >
      <Card>
        <Text style={[type.title, { color: c.ink }]}>{profile?.name ?? 'Demo traveller'}</Text>
        <Text style={[type.body, { color: c.slate }]}>
          {profile?.idRef ?? 'YS-2026-DEMO'} · Valid during this trip
        </Text>
        <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
          <QRCode value={payload} size={190} color={c.ink} backgroundColor={c.card} />
        </View>
        <Text style={[type.caption, { color: c.slate }]}>
          Scan requests are access-logged in the responder demo.
        </Text>
      </Card>
      <Button
        label="Open responder scanner demo"
        variant="secondary"
        onPress={() => router.push('/identity/scan')}
      />
    </Screen>
  );
}
