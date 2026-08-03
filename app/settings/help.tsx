import { View, Text, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { Card, ListRow, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { Phone, Mail, Globe, LifeBuoy } from 'lucide-react-native';

export default function HelpScreen() {
  const c = useAppColors();
  const { t } = useTranslation();

  return (
    <Screen
      title={t('settings.help.title', 'Help & Support')}
      subtitle={t('settings.help.subtitle', 'We are here to assist you 24/7.')}
    >
      <Card style={{ marginBottom: space.md }}>
        <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.sm }]}>
          {t('settings.help.emergency', 'Emergency Assistance')}
        </Text>
        <ListRow
          icon={<Phone color={c.critical} />}
          title={t('settings.help.call112', 'Call 112 (National Emergency)')}
          sub={t('settings.help.call112sub', 'Immediate police, fire, or medical help')}
          onPress={() => Linking.openURL('tel:112')}
        />
        <ListRow
          icon={<LifeBuoy color={c.primary} />}
          title={t('settings.help.tourism', 'Tourist Helpline (1363)')}
          sub={t('settings.help.tourismsub', 'Ministry of Tourism multi-lingual helpline')}
          onPress={() => Linking.openURL('tel:1363')}
        />
      </Card>

      <Card>
        <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.sm }]}>
          {t('settings.help.appSupport', 'App Support')}
        </Text>
        <ListRow
          icon={<Mail color={c.onSurfaceVariant} />}
          title={t('settings.help.email', 'Email Support')}
          sub="support@yatrishield.gov.in"
          onPress={() => Linking.openURL('mailto:support@yatrishield.gov.in')}
        />
        <ListRow
          icon={<Globe color={c.onSurfaceVariant} />}
          title={t('settings.help.website', 'Visit our Website')}
          sub="www.yatrishield.gov.in"
          onPress={() => Linking.openURL('https://yatrishield.gov.in')}
        />
      </Card>

      <View style={{ marginTop: space.xl, alignItems: 'center' }}>
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Yatri Shield v1.0.0</Text>
      </View>
    </Screen>
  );
}
