import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  View,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { Button, Card, Input, ListRow, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { useAppStore } from '@/src/stores/useAppStore';
import { api } from '@/src/services/api';
import { preferences } from '@/src/services/preferences';

const PROFILE_PHOTO_KEY = 'yatri-shield.profile-photo';

export default function AccountScreen() {
  const { logout, profile: localProfile, saveProfile } = useAppStore();
  const c = useAppColors();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/me');
        const data = res.data;
        setName(data.name || localProfile?.name || '');
        setDob(data.dob || '');
        setEmail(data.email || '');
        setPhone(data.phone ? `+${data.phone}` : '');
        setRole(data.role || 'tourist');

        // Load photo from local storage
        const storedPhoto = preferences.getString(PROFILE_PHOTO_KEY);
        if (storedPhoto) setPhotoUri(storedPhoto);
      } catch (e) {
        Alert.alert(t('error', 'Error'), 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [localProfile]);

  const handlePickPhoto = async () => {
    Alert.alert(
      'Photo Upload',
      "Selecting a photo requires a native module that isn't in your current APK. This will work once we build the new APK!",
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me/profile', {
        name,
        dob,
        email,
      });
      // Update local zustand store
      if (localProfile) {
        saveProfile({ ...localProfile, name });
      } else {
        saveProfile({ name, nationality: '', homeCity: '' });
      }
      Alert.alert(
        t('success', 'Success'),
        t('settings.account.saved', 'Profile saved successfully!'),
      );
    } catch (e) {
      Alert.alert(t('error', 'Error'), 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and erase all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand, Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Final Confirmation', 'Type DELETE to confirm account deletion.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete Permanently',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await api.delete('/users/me');
                    preferences.remove(PROFILE_PHOTO_KEY);
                    await logout();
                    router.replace('/(onboarding)/phone');
                  } catch (e: any) {
                    Alert.alert('Error', 'Failed to delete account. Please try again.');
                  } finally {
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Screen title={t('settings.account', 'Account settings')} subtitle="Loading…">
        <View style={{ padding: space.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title={t('settings.account', 'Account settings')}
      subtitle="Manage your account profile."
    >
      <ScrollView>
        <Card style={{ alignItems: 'center', marginBottom: space.md }}>
          <TouchableOpacity onPress={handlePickPhoto}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: c.surfaceVariant,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: space.sm,
              }}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: 100, height: 100 }} />
              ) : (
                <Text style={[type.subtitle, { color: c.onSurfaceVariant }]}>+</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Tap to change photo</Text>
        </Card>

        <Card>
          <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.md }]}>
            Personal Details
          </Text>
          <Input label="Name" value={name} onChangeText={setName} placeholder="Your full name" />
          <Input label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
          <Input
            label="Email ID"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text
            style={[
              type.subtitle,
              { color: c.onSurface, marginTop: space.sm, marginBottom: space.sm },
            ]}
          >
            Account Information
          </Text>
          <ListRow title="Phone Number" sub={phone || 'Not set'} />
          <ListRow title="Account Role" sub={role.toUpperCase()} />
        </Card>

        <View style={{ marginTop: space.md }}>
          <Button
            label={saving ? 'Saving…' : 'Save Profile'}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
          />
        </View>

        <View style={{ marginTop: space.xl, marginBottom: space.xxl }}>
          <Text style={[type.caption, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>
            Deleting your account will permanently erase your profile and anonymize all historical
            data.
          </Text>
          <Button
            label={deleting ? 'Deleting…' : 'Delete Account'}
            variant="destructive"
            onPress={handleDelete}
            disabled={deleting}
            loading={deleting}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
