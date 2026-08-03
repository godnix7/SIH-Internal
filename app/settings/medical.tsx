import { useState, useEffect } from 'react';
import { Alert, View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { Button, Input, Card, ListRow, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function MedicalCard() {
  const c = useAppColors();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [blood, setBlood] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api
      .get('/users/me/medical')
      .then((res) => {
        setBlood(res.data.bloodGroup || '');
        setAllergies((res.data.allergies || []).join(', '));
        setMedications((res.data.medications || []).join(', '));
      })
      .catch((e) => {
        Alert.alert(
          t('error', 'Error'),
          t('settings.medical.loadError', 'Unable to load your data at this time.'),
        );
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.patch('/users/me/medical', {
        bloodGroup: blood,
        allergies: allergies
          ? allergies
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
        medications: medications
          ? medications
              .split(',')
              .map((m) => m.trim())
              .filter(Boolean)
          : [],
      });
      setIsEditing(false);
    } catch (e: any) {
      if (!e.response) {
        Alert.alert(
          t('error', 'No Connection'),
          t('settings.medical.noConnection', 'Could not reach the server.'),
        );
      } else {
        Alert.alert(
          t('error', 'Error'),
          t('settings.medical.saveError', 'Failed to save medical card.'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Screen
        title={t('settings.medicalCard', 'Medical card')}
        subtitle={t('settings.medical.loading', 'Loading your medical information…')}
      >
        <View style={{ padding: space.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title={t('settings.medicalCard', 'Medical card')}
      subtitle={t(
        'settings.medical.subtitle',
        'Every detail is marked self-declared for responders.',
      )}
    >
      <ScrollView>
        <Card style={{ marginBottom: space.md }}>
          {isEditing ? (
            <>
              <Input
                label={t('settings.medical.blood', 'Blood group')}
                value={blood}
                onChangeText={setBlood}
                placeholder="O+"
              />
              <Input
                label={t('settings.medical.allergies', 'Allergies')}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="Peanuts, Penicillin"
              />
              <Input
                label={t('settings.medical.medications', 'Medications and Conditions')}
                value={medications}
                onChangeText={setMedications}
                placeholder="Asthma, Inhaler"
              />
            </>
          ) : (
            <>
              <ListRow
                title={t('settings.medical.blood', 'Blood group')}
                sub={blood || t('settings.none', 'None set')}
              />
              <ListRow
                title={t('settings.medical.allergies', 'Allergies')}
                sub={allergies || t('settings.none', 'None set')}
              />
              <ListRow
                title={t('settings.medical.medications', 'Medications and Conditions')}
                sub={medications || t('settings.none', 'None set')}
              />
            </>
          )}
        </Card>

        {!isEditing && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: space.md,
              paddingHorizontal: space.sm,
            }}
          >
            <Text style={[type.caption, { color: c.primary, fontWeight: 'bold' }]}>
              ✓ {t('settings.medical.synced', 'Saved securely to cloud')}
            </Text>
          </View>
        )}

        <Text style={[type.caption, { color: c.onSurfaceVariant, marginBottom: space.md }]}>
          {t(
            'settings.medical.disclaimer',
            'Self-declared information can be edited any time. It is shared only for an active SOS or emergency handoff.',
          )}
        </Text>

        {isEditing ? (
          <View style={{ gap: space.sm }}>
            <Button
              label={
                loading ? t('saving', 'Saving…') : t('settings.medical.save', 'Save medical card')
              }
              onPress={handleSave}
              disabled={loading}
              loading={loading}
            />
            <Button
              label={t('cancel', 'Cancel')}
              variant="outline"
              onPress={() => setIsEditing(false)}
              disabled={loading}
            />
          </View>
        ) : (
          <Button
            label={t('settings.medical.edit', 'Edit medical card')}
            onPress={() => setIsEditing(true)}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
