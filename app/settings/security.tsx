import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Alert, View, Text, ActivityIndicator } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, ListRow, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function SecurityScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const c = useAppColors();

  useEffect(() => {
    api.get('/users/me/sessions')
      .then(res => setSessions(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load sessions.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRevoke = async () => {
    Alert.alert(
      'Revoke Sessions',
      'This will log you out of all other devices. You will remain logged in on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              await api.delete('/users/me/sessions');
              Alert.alert('Success', 'All other sessions have been revoked.');
              const res = await api.get('/users/me/sessions');
              setSessions(res.data);
            } catch(e: any) {
              console.error(e);
              if (!e.response) {
                Alert.alert('No Connection', 'Could not reach the server.');
              } else {
                Alert.alert('Error', 'Failed to revoke sessions. Please try again.');
              }
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen title="Security & Sessions" subtitle="Manage your active logins and security pin.">
      <Card style={{ marginBottom: space.lg }}>
        <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.sm }]}>Device Security</Text>
        <Text style={[type.caption, { color: c.onSurfaceVariant, marginBottom: space.md }]}>
          Change the 4-digit PIN used to securely cancel SOS alerts on this device.
        </Text>
        <Button 
          label="Change SOS PIN" 
          variant="secondary" 
          onPress={() => router.push('/(onboarding)/pin' as any)}
        />
      </Card>

      <Card>
        <Text style={[type.subtitle, { color: c.onSurface, marginBottom: space.sm }]}>Active Sessions</Text>
        {loading ? (
          <View style={{ padding: space.md, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : sessions.length > 0 ? (
          sessions.map(s => (
            <ListRow 
              key={s.id} 
              title={s.platform?.toUpperCase() || "UNKNOWN DEVICE"} 
              sub={`Last seen: ${new Date(s.lastSeenAt).toLocaleString()}`} 
            />
          ))
        ) : (
          <Text style={{ color: c.onSurfaceVariant }}>No remote sessions found.</Text>
        )}
      </Card>

      <View style={{ marginTop: space.lg }}>
        <Text style={[type.caption, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>
          If you notice suspicious activity, revoke all other sessions immediately. You will remain logged in on this device.
        </Text>
        <Button 
          label={revoking ? "Revoking…" : "Revoke other sessions"} 
          variant="secondary" 
          onPress={handleRevoke}
          disabled={revoking}
          loading={revoking}
        />
      </View>
    </Screen>
  );
}
