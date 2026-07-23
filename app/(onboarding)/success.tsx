import { router } from 'expo-router';
import { Text } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function Success() {
  const profile = useAppStore((state) => state.profile);
  const c = useAppColors();
  return (
    <Screen
      title="Your Digital Tourist ID is ready"
      subtitle="Your verified credential is now active on this device."
    >
      <Card>
        <BadgeCheck color={c.primary} size={32} />
        <Text style={[type.title, { color: c.onSurface }]}>{profile?.name}</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant }]}>
          {profile?.idRef} · Valid for your active trip
        </Text>
      </Card>
      <Button
        label="Continue"
        onPress={() => {
          router.replace('/offline-maps' as any);
        }}
      />
    </Screen>
  );
}
