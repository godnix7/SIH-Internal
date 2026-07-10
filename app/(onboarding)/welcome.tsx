import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { Button, Card, useAppColors } from '@/src/components/ui';
import { Screen } from '@/src/components/Screen';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function Welcome() {
  const c = useAppColors();
  const complete = useAppStore((state) => state.completeOnboarding);
  const setDemo = useAppStore((state) => state.setDemoMode);
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: space.xxl }}>
        <View style={{ gap: space.lg }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: `${c.trail}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck color={c.trail} size={44} />
          </View>
          <Text style={[type.display, { color: c.ink, fontSize: 36, lineHeight: 44 }]}>
            Travel far.{'\n'}Someone&apos;s watching over you.
          </Text>
          <Text style={[type.body, { color: c.slate }]}>
            Plan a trip, choose the support you want, and keep a clear path to help when you need
            it.
          </Text>
          <Card>
            <Text style={[type.heading, { color: c.ink }]}>112 stays one tap away</Text>
            <Text style={[type.body, { color: c.slate }]}>
              Yatri Shield adds your trip context and last known location. It never replaces
              India&apos;s emergency service.
            </Text>
          </Card>
        </View>
        <View style={{ gap: space.sm }}>
          <Button label="Get started" onPress={() => router.push('/concept-tour')} />
          <Button
            label="Explore demo mode"
            variant="ghost"
            onPress={() => {
              setDemo(true);
              complete();
              router.replace('/home');
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
