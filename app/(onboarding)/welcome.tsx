import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react-native';

import { Button, Card, useAppColors } from '@/src/components/ui';
import { Screen } from '@/src/components/Screen';
import { space, type } from '@/src/theme/tokens';

export default function Welcome() {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: space.xxl }}>
        <View style={{ gap: space.lg }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: `${c.primary}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck color={c.primary} size={44} />
          </View>
          <Text style={[type.display, { color: c.onSurface, fontSize: 36, lineHeight: 44 }]}>
            {t('onboarding.title')}
          </Text>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>{t('onboarding.subtitle')}</Text>
          <Card>
            <Text style={[type.subtitle, { color: c.onSurface }]}>
              {t('onboarding.emergencyTitle')}
            </Text>
            <Text style={[type.body, { color: c.onSurfaceVariant }]}>
              {t('onboarding.emergencyBody')}
            </Text>
          </Card>
        </View>
        <View style={{ gap: space.sm }}>
          <Button label={t('onboarding.getStarted')} onPress={() => router.push('/concept-tour')} />
        </View>
      </View>
    </Screen>
  );
}
