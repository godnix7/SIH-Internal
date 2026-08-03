import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function LanguageScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const { language, setLanguage, setTheme, theme } = useAppStore();

  const handleSetLanguage = async (lang: 'en' | 'hi') => {
    try {
      await api.patch(`/users/me/language?language=${lang}`);
      setLanguage(lang);
    } catch (e) {
      console.error('Failed to save language to backend', e);
      setLanguage(lang); // still set locally to not break UX
    }
  };

  return (
    <Screen title="Language and appearance" subtitle="Changes apply immediately.">
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>
          {t('settings.language', { defaultValue: 'Language' })}
        </Text>
        <View style={{ marginTop: space.sm, gap: space.sm }}>
          <Button
            label="English"
            variant={language === 'en' ? 'primary' : 'secondary'}
            onPress={() => handleSetLanguage('en')}
          />
          <Button
            label="हिन्दी"
            variant={language === 'hi' ? 'primary' : 'secondary'}
            onPress={() => handleSetLanguage('hi')}
          />
        </View>
      </Card>
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.sm }]}>
          Appearance
        </Text>
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          <View style={{ flex: 1 }}>
            <Button
              label="System"
              variant={theme === 'system' ? 'primary' : 'secondary'}
              onPress={() => setTheme('system')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Light"
              variant={theme === 'light' ? 'primary' : 'secondary'}
              onPress={() => setTheme('light')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Dark"
              variant={theme === 'dark' ? 'primary' : 'secondary'}
              onPress={() => setTheme('dark')}
            />
          </View>
        </View>
      </Card>
    </Screen>
  );
}
