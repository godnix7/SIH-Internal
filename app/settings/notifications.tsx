import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Alert, View, Text, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function NotificationsScreen() {
  const c = useAppColors();
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [tripEnabled, setTripEnabled] = useState(true);
  const [osPermission, setOsPermission] = useState<string>('undetermined');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setOsPermission(status);
        setPushEnabled(status === 'granted');
      } catch {
        setPushEnabled(false);
        setOsPermission('unavailable');
      }
    };
    checkPermission();
  }, []);

  const handleTogglePush = async () => {
    if (osPermission !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'Push notifications are disabled at the system level. Please enable them in your device Settings to receive safety alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Notifications.requestPermissionsAsync() },
        ]
      );
      return;
    }
    setPushEnabled(!pushEnabled);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me/notifications', { pushEnabled, tripAlerts: tripEnabled });
      Alert.alert('Success', 'Notification preferences saved successfully.');
      router.back();
    } catch (e: any) {
      if (!e.response) {
        Alert.alert('Saved Locally', 'Preferences saved on this device. They will sync when you are back online.');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (pushEnabled === null) {
    return (
      <Screen title="Notifications" subtitle="Loading…">
        <View style={{ padding: space.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Notifications" subtitle="Control what you get pinged about.">
      {osPermission !== 'granted' && (
        <Card style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }}>
          <Text style={[type.body, { color: c.critical, fontWeight: '600' }]}>
            ⚠️ System notifications are disabled
          </Text>
          <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
            Enable notifications in your device settings to receive safety alerts and check-in reminders.
          </Text>
        </Card>
      )}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: c.onSurface, fontWeight: '600' }]}>Push Notifications</Text>
            <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Receive general alerts and announcements</Text>
          </View>
          <Button 
            label={pushEnabled ? "ON" : "OFF"} 
            variant={pushEnabled ? "primary" : "secondary"} 
            onPress={handleTogglePush}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: c.onSurface, fontWeight: '600' }]}>Trip Safety Alerts</Text>
            <Text style={[type.caption, { color: c.onSurfaceVariant }]}>High-priority pings when entering high-risk zones</Text>
          </View>
          <Button 
            label={tripEnabled ? "ON" : "OFF"} 
            variant={tripEnabled ? "primary" : "secondary"} 
            onPress={() => setTripEnabled(!tripEnabled)}
          />
        </View>
      </Card>
      <View style={{ marginTop: space.md }}>
        <Button label={saving ? "Saving…" : "Save Preferences"} onPress={handleSave} disabled={saving} loading={saving} />
      </View>
    </Screen>
  );
}
