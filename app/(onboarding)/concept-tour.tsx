import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { BellRing, MapPinned, ShieldCheck } from 'lucide-react-native';

import { Button, useAppColors } from '@/src/components/ui';
import { Screen } from '@/src/components/Screen';
import { space, type } from '@/src/theme/tokens';

const slides = [
  {
    title: 'Your trip, your rules',
    body: 'Choose Off, Check-ins, Zone alerts, or Full monitoring. Check-ins only is the default.',
    icon: MapPinned,
  },
  {
    title: 'Trouble found early',
    body: 'Missed check-ins and reliable restricted-zone entries can prompt a calm, graduated response.',
    icon: BellRing,
  },
  {
    title: 'Help with context',
    body: 'An SOS shares the identity, itinerary and medical card you choose with the control room.',
    icon: ShieldCheck,
  },
];
export default function ConceptTour() {
  const [index, setIndex] = useState(0);
  const c = useAppColors();
  const slide = slides[index];
  const Icon = slide.icon;
  const last = index === slides.length - 1;
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: space.xxl }}>
        <View style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {slides.map((_, item) => (
              <View
                key={item}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: item <= index ? c.primary : c.surfaceVariant,
                }}
              />
            ))}
          </View>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: `${c.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon color={c.primary} size={42} />
          </View>
          <Text style={[type.display, { color: c.onSurface }]}>{slide.title}</Text>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>{slide.body}</Text>
        </View>
        <View style={{ gap: space.sm }}>
          <Button
            label={last ? 'Set up my ID' : 'Next'}
            onPress={() => (last ? router.push('/phone') : setIndex((value) => value + 1))}
          />
          <Button label="Skip for now" variant="ghost" onPress={() => router.replace('/phone')} />
        </View>
      </View>
    </Screen>
  );
}
