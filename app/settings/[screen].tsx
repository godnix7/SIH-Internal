import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Play } from 'lucide-react-native';

import i18n from '@/src/i18n';
import { Screen } from '@/src/components/Screen';
import { Button, Card, Input, ListRow, Toast, useAppColors } from '@/src/components/ui';
import { demoEngine } from '@/src/services/demoEngine';
import { activeTrip, useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { screen } = useLocalSearchParams<{ screen: string }>();
  const c = useAppColors();
  const [toast, setToast] = useState(false);
  const {
    profile,
    trips,
    demoMode,
    setDemoMode,
    setLanguage,
    setTheme,
    theme,
    addAlert,
    createTrip,
  } = useAppStore();
  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };
  if (screen === 'privacy')
    return (
      <Screen title="Privacy centre" subtitle="Your trip decides what leaves this phone.">
        <Card>
          <Text style={[type.heading, { color: c.ink }]}>Current data summary</Text>
          <Text style={[type.body, { color: c.slate }]}>
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
              body: 'Open incidents are preserved for legal-hold review. No ended trips were eligible in this demo.',
            });
            showToast();
          }}
        />
        <ListRow
          icon={<Play color={c.trail} />}
          title="Demo Lab"
          sub="Run deterministic safety scenarios"
          onPress={() => router.push('/settings/demo-lab')}
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
          <Text style={[type.caption, { color: c.slate }]}>
            You can silently remove any contact. They are never told that they were removed.
          </Text>
        </Card>
        <Button label="Add another contact" variant="secondary" onPress={showToast} />
        <Toast
          visible={toast}
          message="A contact form is available in the complete account service; demo contact added locally."
        />
      </Screen>
    );
  if (screen === 'medical') return <MedicalCard onSaved={showToast} toast={toast} />;
  if (screen === 'language')
    return (
      <Screen title="Language and appearance" subtitle="Changes apply immediately.">
        <Card>
          <Text style={[type.heading, { color: c.ink }]}>Language</Text>
          <Button
            label="English"
            variant={profile?.language !== 'hi' ? 'primary' : 'secondary'}
            onPress={() => {
              setLanguage('en');
              void i18n.changeLanguage('en');
            }}
          />
          <Button
            label="हिन्दी"
            variant={profile?.language === 'hi' ? 'primary' : 'secondary'}
            onPress={() => {
              setLanguage('hi');
              void i18n.changeLanguage('hi');
            }}
          />
        </Card>
        <Card>
          <Text style={[type.heading, { color: c.ink }]}>Appearance</Text>
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
  if (screen === 'demo-lab')
    return (
      <DemoLab
        enabled={demoMode}
        onToggle={setDemoMode}
        onScenario={async (name) => {
          let trip = activeTrip(useAppStore.getState().trips);
          if (!trip)
            trip = await createTrip({
              destination:
                name === 'jaipur'
                  ? 'Jaipur, Rajasthan'
                  : name === 'sikkim'
                    ? 'Gangtok, Sikkim'
                    : 'Sahastra Tal, Uttarakhand',
              startDate: '2026-07-12',
              endDate: '2026-07-16',
              tier: 'full',
              trek: name === 'sahastra' ? 'Sahastra Tal' : undefined,
            });
          demoEngine.run(name, trip.zones, 8, (event) => {
            const critical = event.includes('restricted') || event === 'sos';
            addAlert({
              kind: critical ? 'incident' : 'zone',
              severity: critical ? 'critical' : 'warning',
              title: event === 'offline' ? 'Demo network loss' : `Demo event: ${event}`,
              body:
                event === 'offline'
                  ? 'The queue remains available. Critical events get priority when connectivity returns.'
                  : 'This event passed through the same local location pipeline.',
            });
          });
          if (name === 'sos') router.push('/shield');
          else router.push(`/trip/${trip.id}`);
        }}
      />
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
      <Text style={[type.caption, { color: useAppColors().slate }]}>
        Self-declared information can be edited any time. It is shared only for an active SOS or
        emergency handoff.
      </Text>
      <Button label="Save medical card" onPress={onSaved} />
      <Toast visible={toast} message="Your self-declared medical card is saved locally." />
    </Screen>
  );
}

function DemoLab({
  enabled,
  onToggle,
  onScenario,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onScenario: (scenario: 'jaipur' | 'sikkim' | 'sahastra' | 'sos') => void;
}) {
  const c = useAppColors();
  return (
    <Screen
      title="Demo Lab"
      subtitle="Every scenario uses bundled data and a deterministic GPS replayer. No real person is monitored."
    >
      <Card>
        <Text style={[type.heading, { color: c.ink }]}>Demo mode is {enabled ? 'on' : 'off'}</Text>
        <Text style={[type.body, { color: c.slate }]}>
          The dashboard carries a DEMO watermark and all operator records are local mock data.
        </Text>
        <Button
          label={enabled ? 'Turn demo mode off' : 'Turn demo mode on'}
          variant="secondary"
          onPress={() => onToggle(!enabled)}
        />
      </Card>
      <Button
        label="City stroll · Jaipur"
        variant="secondary"
        onPress={() => onScenario('jaipur')}
      />
      <Button
        label="Restricted brush · Sikkim border"
        variant="secondary"
        onPress={() => onScenario('sikkim')}
      />
      <Button label="Hero demo · Sahastra Tal at 8×" onPress={() => onScenario('sahastra')} />
      <Button label="SOS drill" variant="destructive" onPress={() => onScenario('sos')} />
      <Text style={[type.caption, { color: c.slate }]}>
        Sahastra Tal replays a corridor deviation and an offline interval. The check-in escalation
        is represented in the alerts feed.
      </Text>
    </Screen>
  );
}
