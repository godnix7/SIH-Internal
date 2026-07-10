import { router } from 'expo-router';
import {
  ChevronRight,
  CreditCard,
  Globe2,
  HeartPulse,
  LockKeyhole,
  UsersRound,
} from 'lucide-react-native';
import { Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Card, ListRow, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { type } from '@/src/theme/tokens';

export default function ProfileScreen() {
  const c = useAppColors();
  const profile = useAppStore((state) => state.profile);
  return (
    <Screen
      title="Profile"
      subtitle={profile ? `${profile.name} · ${profile.idRef}` : 'Set up your Digital Tourist ID'}
    >
      <Card>
        <ListRow
          icon={<CreditCard color={c.primary} />}
          title="Digital Tourist ID"
          sub="Show a signed demo QR to a responder"
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
      </Card>
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
        The Demo Lab is available from your privacy centre. It marks operator data clearly as demo
        data.
      </Text>
    </Screen>
  );
}
