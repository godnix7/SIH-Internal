import { router } from 'expo-router';
import { Text } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function Success() {
  const profile = useAppStore((state) => state.profile);
  const complete = useAppStore((state) => state.completeOnboarding);
  const c = useAppColors();
  return (
    <Screen
      title="Your Digital Tourist ID is ready"
      subtitle="It is a demo credential for this local build."
    >
      <Card>
        <BadgeCheck color={c.trail} size={32} />
        <Text style={[type.title, { color: c.ink }]}>{profile?.name}</Text>
        <Text style={[type.body, { color: c.slate }]}>
          {profile?.idRef} · Valid for your active trip
        </Text>
        <Text style={[type.caption, { color: c.slate, marginTop: space.xs }]}>
          QR details are signed in the demo only. This is not a government identity document.
        </Text>
      </Card>
      <Button
        label="Add it to a trip"
        onPress={() => {
          complete();
          router.replace('/trip/new');
        }}
      />
    </Screen>
  );
}
