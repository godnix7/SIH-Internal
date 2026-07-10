import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/src/components/Screen';
import { Button, Card, Input, ListRow, Toast, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { screen } = useLocalSearchParams<{ screen: string }>();
  const c = useAppColors();
  const { t } = useTranslation();
  const [toast, setToast] = useState(false);
  const { trips, language, setLanguage, setTheme, theme, addAlert } = useAppStore();
  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };
  if (screen === 'privacy')
    return (
      <Screen title="Privacy centre" subtitle="Your trip decides what leaves this phone.">
        <Card>
          <Text style={[type.subtitle, { color: c.onSurface }]}>Current data summary</Text>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>
            Trips on this device: {trips.length}. Full-monitoring trails are set to auto-delete 30
            days after a trip ends. Advisory-zone events stay on this device.
          </Text>
        </Card>
        <Button label="Download my data" variant="secondary" onPress={showToast} />
        <Button
          label="Delete ended trip data"
          variant="destructive"
          onPress={() => {
            addAlert({
              kind: 'system',
              severity: 'warning',
              title: 'No ended trip data deleted',
              body: 'Open incidents are preserved for legal-hold review. No ended trips were eligible for deletion.',
            });
            showToast();
          }}
        />
        <Toast
          visible={toast}
          message="A local JSON export is prepared in a production build; this demo keeps data on-device."
        />
      </Screen>
    );
  if (screen === 'contacts')
    return (
      <Screen
        title="Emergency contacts"
        subtitle="Contacts receive an escalation, not your location history."
      >
        <Card>
          <ListRow title="Ananya Sharma" sub="Sister · SOS and missed check-in escalation" />
          <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
            You can silently remove any contact. They are never told that they were removed.
          </Text>
        </Card>
        <Button label="Add another contact" variant="secondary" onPress={showToast} />
        <Toast
          visible={toast}
          message="A contact form is available in the complete account service; test contact added locally."
        />
      </Screen>
    );
  if (screen === 'medical') return <MedicalCard onSaved={showToast} toast={toast} />;
  if (screen === 'language')
    return (
      <Screen title="Language and appearance" subtitle="Changes apply immediately.">
        <Card>
          <Text style={[type.subtitle, { color: c.onSurface }]}>{t('settings.language')}</Text>
          <Button
            label="English"
            variant={language === 'en' ? 'primary' : 'secondary'}
            onPress={() => setLanguage('en')}
          />
          <Button
            label="हिन्दी"
            variant={language === 'hi' ? 'primary' : 'secondary'}
            onPress={() => setLanguage('hi')}
          />
        </Card>
        <Card>
          <Text style={[type.subtitle, { color: c.onSurface }]}>Appearance</Text>
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
  return (
    <Screen title="Settings" subtitle="Choose a profile setting.">
      <Button label="Back to profile" onPress={() => router.replace('/profile')} />
    </Screen>
  );
}

function MedicalCard({ onSaved, toast }: { onSaved: () => void; toast: boolean }) {
  const [blood, setBlood] = useState('O+');
  const [allergies, setAllergies] = useState('None known');
  const [medications, setMedications] = useState('');
  return (
    <Screen title="Medical card" subtitle="Every detail is marked self-declared for responders.">
      <Input label="Blood group" value={blood} onChangeText={setBlood} />
      <Input label="Allergies" value={allergies} onChangeText={setAllergies} />
      <Input
        label="Medicines and conditions"
        value={medications}
        onChangeText={setMedications}
        placeholder="For example, inhaler in day pack"
      />
      <Text style={[type.caption, { color: useAppColors().onSurfaceVariant }]}>
        Self-declared information can be edited any time. It is shared only for an active SOS or
        emergency handoff.
      </Text>
      <Button label="Save medical card" onPress={onSaved} />
      <Toast visible={toast} message="Your self-declared medical card is saved locally." />
    </Screen>
  );
}
