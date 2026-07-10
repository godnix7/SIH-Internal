import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { EyeOff, HeartPulse } from 'lucide-react-native';

import { Screen } from '@/src/components/Screen';
import { Button, Card, SOSButton, useAppColors } from '@/src/components/ui';
import type { SOSRecord } from '@/src/lib/types';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function ShieldScreen() {
  const c = useAppColors();
  const beginSos = useAppStore((state) => state.beginSos);
  const [kind, setKind] = useState<SOSRecord['type']>('police');
  const start = async (silent = false) => {
    await beginSos(kind, silent);
    router.push('/sos/active');
  };
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: space.lg }}>
        <View style={{ gap: space.sm }}>
          <Text style={[type.display, { color: c.ink }]}>Need help?</Text>
          <Text style={[type.body, { color: c.slate }]}>
            Hold the button for 1.5 seconds. A five-second countdown gives you time to cancel an
            accidental SOS.
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <SOSButton onComplete={() => void start(false)} />
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <Button
              label="Medical"
              variant={kind === 'medical' ? 'primary' : 'secondary'}
              onPress={() => setKind('medical')}
            />
            <Button
              label="Police"
              variant={kind === 'police' ? 'primary' : 'secondary'}
              onPress={() => setKind('police')}
            />
            <Button
              label="Just watch me"
              variant={kind === 'watch' ? 'primary' : 'secondary'}
              onPress={() => setKind('watch')}
            />
          </View>
        </View>
        <View style={{ gap: space.sm }}>
          <Card>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <EyeOff color={c.slate} />
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: c.ink }]}>Silent SOS</Text>
                <Text style={[type.body, { color: c.slate }]}>
                  This local demo uses two short vibrations and a discreet weather-card screen after
                  you trigger it.
                </Text>
              </View>
            </View>
            <Button label="Start silent SOS" variant="ghost" onPress={() => void start(true)} />
          </Card>
          <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
            <HeartPulse color={c.signal} size={17} />
            <Text style={[type.caption, { color: c.slate, flex: 1 }]}>
              For immediate emergency services, call 112. Yatri Shield adds context; it does not
              replace 112.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
