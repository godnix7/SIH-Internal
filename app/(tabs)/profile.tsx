import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ChevronRight,
  CreditCard,
  Globe2,
  HeartPulse,
  LockKeyhole,
  UsersRound,
  LogOut,
  Bell,
  ShieldCheck,
  User,
  HelpCircle,
  UserCircle2,
} from 'lucide-react-native';
import { Text, View, ActivityIndicator, Alert, Image } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Card, ListRow, useAppColors, Button } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { type, space } from '@/src/theme/tokens';
import { api } from '@/src/services/api';
import { storage } from '@/src/lib/storage';
import { preferences } from '@/src/services/preferences';
import { useTranslation } from 'react-i18next';

type UserProfile = {
  id: string;
  phone: string;
  role: string;
  status: string;
  identity?: {
    nameVerified: boolean;
  };
};

export default function ProfileScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const { profile, logout } = useAppStore();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await api.get('/users/me');
        setUserData(data);

        const storedPhoto = preferences.getString('yatri-shield.profile-photo');
        if (storedPhoto) setPhotoUri(storedPhoto);
      } catch (e) {
        console.error('Failed to load profile:', e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = () => {
    if (loggingOut) return;
    Alert.alert('Log Out', 'Are you sure you want to log out of your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            // Step 1: Attempt server-side session invalidation (best-effort)
            try {
              await api.post('/auth/logout');
            } catch {
              // Server invalidation failed — continue anyway
            }

            // Step 2: Clear local tokens
            await storage.clearTokens();

            // Step 3: Reset app state
            await logout();

            // Step 4: Redirect
            router.replace('/(onboarding)/phone');
          } catch (e) {
            console.error('Logout error:', e);
            // Even if something fails, try to redirect
            Alert.alert(
              'Logout Issue',
              'There was an issue during logout. You have been signed out locally.',
              [{ text: 'OK', onPress: () => router.replace('/(onboarding)/phone') }],
            );
          }
        },
      },
    ]);
  };

  return (
    <Screen
      title="Profile"
      subtitle={
        loading
          ? 'Loading...'
          : userData?.name
            ? userData.name
            : userData?.phone
              ? `+${userData.phone}`
              : 'Set up your Digital Tourist ID'
      }
    >
      {/* Profile Header */}
      <View style={{ alignItems: 'center', marginBottom: space.lg, marginTop: space.sm }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: c.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space.sm,
            overflow: 'hidden',
          }}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 80, height: 80 }} />
          ) : (
            <UserCircle2 color={c.primary} size={48} />
          )}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : loadError ? (
          <Text style={[type.caption, { color: c.critical }]}>Failed to load profile data</Text>
        ) : (
          <>
            <Text style={[type.title, { color: c.onSurface }]}>
              {userData?.name ? userData.name : userData?.phone ? `+${userData.phone}` : 'Tourist'}
            </Text>
            <Text style={[type.caption, { color: c.onSurfaceVariant, marginTop: 2 }]}>
              {userData?.role ? userData.role.toUpperCase() : 'USER'}
            </Text>
          </>
        )}
      </View>
      <Card>
        <ListRow
          icon={<CreditCard color={c.primary} />}
          title="Digital Tourist ID"
          sub={userData?.identity?.nameVerified ? 'Verified ID' : 'Set up your verified identity'}
          onPress={() => router.push('/identity/card')}
          trailing={<ChevronRight color={c.onSurfaceVariant} />}
        />
        <ListRow
          icon={<HeartPulse color={c.critical} />}
          title="Medical card"
          sub="Self-declared details for emergencies"
          onPress={() => router.push('/settings/medical')}
        />
        <ListRow
          icon={<UsersRound color={c.primary} />}
          title="Emergency contacts"
          sub="Choose who receives an escalation"
          onPress={() => router.push('/settings/contacts')}
        />
        <ListRow
          icon={<LockKeyhole color={c.primary} />}
          title="Privacy centre"
          sub="Review trip data and consent"
          onPress={() => router.push('/settings/privacy')}
        />
        <ListRow
          icon={<Globe2 color={c.primary} />}
          title="Language and appearance"
          sub="English, हिन्दी, light or dark"
          onPress={() => router.push('/settings/language')}
        />
        <ListRow
          icon={<Bell color={c.primary} />}
          title="Notifications"
          sub="Push, SMS, Daily Check-in preferences"
          onPress={() => router.push('/settings/notifications')}
        />
        <ListRow
          icon={<ShieldCheck color={c.primary} />}
          title="Security & Sessions"
          sub="Manage active logins"
          onPress={() => router.push('/settings/security')}
        />
        <ListRow
          icon={<User color={c.primary} />}
          title="Account settings"
          sub="Manage or delete your account"
          onPress={() => router.push('/settings/account')}
        />
        <ListRow
          icon={<HelpCircle color={c.primary} />}
          title={t('settings.help.title', 'Help & Support')}
          sub={t('settings.help.desc', 'Contact emergency support or feedback')}
          onPress={() => router.push('/settings/help')}
        />
      </Card>

      <View style={{ marginVertical: space.md }}>
        <Button
          label={loggingOut ? 'Logging out…' : 'Log out'}
          variant="secondary"
          onPress={handleLogout}
          disabled={loggingOut}
          loading={loggingOut}
          icon={<LogOut color={c.onSurfaceVariant} size={18} />}
        />
      </View>
    </Screen>
  );
}
