import QRCode from 'react-native-qrcode-svg';
import { Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Card, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function IdentityCard() {
  const profile = useAppStore((state) => state.profile);
  const c = useAppColors();
  const payload = JSON.stringify({
    v: 1,
    id: profile?.idRef ?? 'YS-2026',
    name: profile?.name ?? 'Traveller',
    status: 'verified',
  });
  return (
    <Screen title="Digital Tourist ID" subtitle="A signed digital credential.">
      <Card>
        <Text style={[type.title, { color: c.onSurface }]}>{profile?.name ?? 'Traveller'}</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant }]}>
          {profile?.idRef ?? 'YS-2026'} · Valid during this trip
        </Text>
        <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
          <QRCode value={payload} size={190} color={c.onSurface} backgroundColor={c.surface} />
        </View>
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
          Scan requests are access-logged by responders.
        </Text>
      </Card>
    </Screen>
  );
}
