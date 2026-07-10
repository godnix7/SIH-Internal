import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EyeOff, HeartPulse } from 'lucide-react-native';

import { Screen } from '@/src/components/Screen';
import { Button, Card, SOSButton, useAppColors } from '@/src/components/ui';
import type { SOSRecord } from '@/src/lib/types';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function ShieldScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
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
          <Text style={[type.display, { color: c.ink }]}>{t('shield.title')}</Text>
          <Text style={[type.body, { color: c.slate }]}>{t('shield.hint')}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <SOSButton onComplete={() => void start(false)} />
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <Button
              label={t('shield.medical')}
              variant={kind === 'medical' ? 'primary' : 'secondary'}
              onPress={() => setKind('medical')}
            />
            <Button
              label={t('shield.police')}
              variant={kind === 'police' ? 'primary' : 'secondary'}
              onPress={() => setKind('police')}
            />
            <Button
              label={t('shield.watch')}
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
                <Text style={[type.heading, { color: c.ink }]}>{t('shield.silentTitle')}</Text>
                <Text style={[type.body, { color: c.slate }]}>{t('shield.silentBody')}</Text>
              </View>
            </View>
            <Button
              label={t('shield.silentStart')}
              variant="ghost"
              onPress={() => void start(true)}
            />
          </Card>
          <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
            <HeartPulse color={c.signal} size={17} />
            <Text style={[type.caption, { color: c.slate, flex: 1 }]}>
              {t('shield.disclaimer')}
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
