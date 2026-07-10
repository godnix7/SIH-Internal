import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react-native';

import { Button, Card, useAppColors } from '@/src/components/ui';
import { Screen } from '@/src/components/Screen';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function Welcome() {
  const c = useAppColors();
  const { t } = useTranslation();
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
            {t('onboarding.title')}
          </Text>
          <Text style={[type.body, { color: c.slate }]}>{t('onboarding.subtitle')}</Text>
          <Card>
            <Text style={[type.heading, { color: c.ink }]}>{t('onboarding.emergencyTitle')}</Text>
            <Text style={[type.body, { color: c.slate }]}>{t('onboarding.emergencyBody')}</Text>
          </Card>
        </View>
        <View style={{ gap: space.sm }}>
          <Button label={t('onboarding.getStarted')} onPress={() => router.push('/concept-tour')} />
          <Button
            label={t('onboarding.exploreDemo')}
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
