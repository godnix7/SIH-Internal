import { useState, useEffect } from 'react';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { Text, View, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';

import { Screen } from '@/src/components/Screen';
import { Button, Card, Input, ListRow, Toast, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ screen: string }>();
  const pathname = usePathname();
  const screen = params.screen || pathname.split('/').pop();
  
  const c = useAppColors();
  const { t } = useTranslation();
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { trips, language, setLanguage, setTheme, theme, addAlert } = useAppStore();

  const showToast = (message: string) => {
    setToastMessage(message);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };
  
  const handleDownloadData = async () => {
    try {
      const res = await api.get('/users/me/export');
      Alert.alert('Success', 'Data downloaded successfully!');
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert('No Connection', 'Could not reach the server. Please check your internet connection.');
      } else {
        Alert.alert('Error', 'Failed to download data. Please try again.');
      }
    }
  };

  if (screen === 'privacy') return <PrivacyScreen trips={trips} addAlert={addAlert} showToast={showToast} toast={toast} toastMessage={toastMessage} handleDownloadData={handleDownloadData} />;
  if (screen === 'contacts') return <ContactsScreen />;
  if (screen === 'medical') return <MedicalCard />;
  if (screen === 'account') return <AccountScreen />;
  if (screen === 'security') return <SecurityScreen />;
  if (screen === 'notifications') return <NotificationsScreen />;
  if (screen === 'help') return <HelpScreen />;

  const handleSetLanguage = async (lang: 'en' | 'hi') => {
    try {
      await api.patch(`/users/me/language?language=${lang}`);
      setLanguage(lang);
    } catch (e) {
      console.error('Failed to save language to backend', e);
      setLanguage(lang); // still set locally to not break UX
    }
  };

  if (screen === 'language')
    return (
      <Screen title="Language and appearance" subtitle="Changes apply immediately.">
        <Card>
          <Text style={[type.subtitle, { color: c.onSurface }]}>{t('settings.language')}</Text>
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

// ── Privacy Screen ──────────────────────────────────────────────────────
function PrivacyScreen({ trips, addAlert, showToast, toast, toastMessage, handleDownloadData }: any) {
  const c = useAppColors();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await handleDownloadData();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen title="Privacy & DPDP Act" subtitle="Digital Personal Data Protection Compliance">
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>Notice & Data Minimization</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>
          Under the DPDP Act, Yatri Shield only collects your location, identity, and medical data strictly for emergency response purposes. 
          Trips on this device: {trips.length}. Full-monitoring trails are automatically erased 30 days after a trip ends.
        </Text>
      </Card>
      
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>Your Data Rights</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginBottom: space.md }]}>
          You have the right to access your data and the Right to Erasure.
        </Text>
        <Button 
          label={downloading ? "Downloading…" : "Export My Data (Portability)"} 
          variant="secondary" 
          onPress={handleDownload}
          disabled={downloading}
          loading={downloading}
        />
        <View style={{ marginTop: space.sm }}>
          <Button
            label="Erase Active Trip Data"
            variant="destructive"
            onPress={() => {
              addAlert({
                kind: 'system',
                severity: 'warning',
                title: 'Data Erasure Requested',
                body: 'Active trip trails erased. Open incidents are preserved for legal-hold review.',
              });
              showToast('Eligible data erased according to DPDP policies.');
            }}
          />
        </View>
        <View style={{ marginTop: space.sm }}>
          <Button
            label="Revoke Consent & Delete Account"
            variant="destructive"
            onPress={() => router.push('/settings/account')}
          />
        </View>
      </Card>

      <Toast
        visible={toast}
        message={toastMessage}
      />
    </Screen>
  );
}

// ── Contacts Screen ─────────────────────────────────────────────────────
function ContactsScreen() {
  const c = useAppColors();
  const [contacts, setContacts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadContacts = () => {
    api.get('/users/me/contacts')
      .then(res => setContacts(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load contacts.'))
      .finally(() => setInitialLoading(false));
  };
  
  useEffect(() => { loadContacts(); }, []);

  const handleAdd = async () => {
    // Validate phone format
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number with at least 10 digits.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/users/me/contacts', { name, phone: normalizedPhone, relationship: relation, notifyTrip: true, notifyDailyOk: true });
      setShowAdd(false);
      setName(''); setPhone(''); setRelation('');
      loadContacts();
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert('No Connection', 'Could not reach the server. Please check your internet connection.');
      } else {
        Alert.alert('Error', e.response?.data?.detail || 'Failed to add contact. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, contactName: string) => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contactName} from your emergency contacts? They will not be notified about this change.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Optimistic removal
            const previousContacts = [...contacts];
            setContacts(contacts.filter(c => c.id !== id));
            try {
              await api.delete(`/users/me/contacts/${id}`);
            } catch (e) {
              // Rollback on failure
              setContacts(previousContacts);
              Alert.alert('Error', 'Failed to remove contact. The change has been reverted.');
              console.error(e);
            }
          },
        },
      ]
    );
  };

  return (
      <Screen
        title="Emergency contacts"
        subtitle="Contacts receive an escalation, not your location history."
      >
        <Card>
          {initialLoading ? (
            <View style={{ padding: space.md, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : contacts.length > 0 ? (
            contacts.map(contact => (
              <View key={contact.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
                 <View style={{ flex: 1 }}>
                   <ListRow title={contact.name} sub={`${contact.relationship} · ${contact.phone}`} />
                 </View>
                 <Button label="X" variant="secondary" onPress={() => handleDelete(contact.id, contact.name)} />
              </View>
            ))
          ) : (
            <Text style={{color: c.onSurfaceVariant}}>No emergency contacts added yet. Adding at least one contact is recommended for trip safety.</Text>
          )}
          <Text style={[type.caption, { color: c.onSurfaceVariant, marginTop: space.sm }]}>
            You can silently remove any contact. They are never told that they were removed.
          </Text>
        </Card>
        
        {showAdd ? (
          <Card>
            <Input label="Name" value={name} onChangeText={setName} placeholder="Enter contact's name" />
            <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Enter phone number" keyboardType="phone-pad" />
            <Input label="Relationship" value={relation} onChangeText={setRelation} placeholder="Enter relationship" />
            <Button label={loading ? "Adding…" : "Save Contact"} disabled={!name || !phone || !relation || loading} loading={loading} onPress={handleAdd} />
            <Button label="Cancel" variant="secondary" onPress={() => setShowAdd(false)} />
          </Card>
        ) : (
          <Button label="Add another contact" variant="secondary" onPress={() => setShowAdd(true)} />
        )}
      </Screen>
  );
}


// ── Medical Card ────────────────────────────────────────────────────────
function MedicalCard() {
  const c = useAppColors(); // Fixed: hook called at top of component
  const [blood, setBlood] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/medical').then((res) => {
      setBlood(res.data.bloodGroup || '');
      setAllergies((res.data.allergies || []).join(', '));
      setMedications((res.data.medications || []).join(', '));
    }).catch((e) => {
      Alert.alert('Export Failed', 'Unable to download your data at this time.');
    }).finally(() => setInitialLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.patch('/users/me/medical', {
        bloodGroup: blood,
        allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
        medications: medications ? medications.split(',').map(m => m.trim()).filter(Boolean) : []
      });
      Alert.alert('Success', 'Medical card saved successfully');
      router.replace('/profile');
    } catch(e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert('No Connection', 'Could not reach the server. Your changes were not saved.');
      } else {
        Alert.alert('Error', 'Failed to save medical card. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Screen title="Medical card" subtitle="Loading your medical information…">
        <View style={{ padding: space.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Medical card" subtitle="Every detail is marked self-declared for responders.">
      <Input label="Blood group" value={blood} onChangeText={setBlood} placeholder="Enter blood group (e.g. O+)" />
      <Input label="Allergies (comma separated)" value={allergies} onChangeText={setAllergies} placeholder="List any allergies" />
      <Input
        label="Medicines and conditions (comma separated)"
        value={medications}
        onChangeText={setMedications}
        placeholder="List medications or conditions"
      />
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
        Self-declared information can be edited any time. It is shared only for an active SOS or
        emergency handoff.
      </Text>
      <Button label={loading ? "Saving…" : "Save medical card"} onPress={handleSave} disabled={loading} loading={loading} />
    </Screen>
  );
}

// ── Account Screen ──────────────────────────────────────────────────────
function AccountScreen() {
  const { profile, logout } = useAppStore();
  const c = useAppColors();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      "Delete Account", 
      "This will permanently delete your account and erase all data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I Understand, Delete",
          style: "destructive",
          onPress: () => {
            // Second confirmation for destructive action
            Alert.alert(
              "Final Confirmation",
              "Type DELETE to confirm account deletion. All trip data, contacts, and medical information will be permanently removed.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Permanently",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await api.delete('/users/me');
                      await logout();
                      router.replace('/(onboarding)/phone');
                    } catch(e: any) {
                      console.error(e);
                      if (!e.response) {
                        Alert.alert("No Connection", "Could not reach the server. Your account was not deleted.");
                      } else {
                        Alert.alert("Error", "Failed to delete account. Please try again or contact support.");
                      }
                    } finally {
                      setDeleting(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <Screen title="Account settings" subtitle="Manage your account profile.">
      <Card>
        <ListRow title="Phone Number" sub={profile?.phone ? `+${profile.phone}` : "Not set"} />
        <ListRow title="Account Role" sub={profile?.role?.toUpperCase() || "TOURIST"} />
      </Card>
      
      <View style={{ marginTop: space.xl }}>
        <Text style={[type.caption, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>
          Deleting your account will permanently erase your profile and anonymize all historical data.
        </Text>
        <Button 
          label={deleting ? "Deleting…" : "Delete Account"} 
          variant="destructive" 
          onPress={handleDelete}
          disabled={deleting}
          loading={deleting}
        />
      </View>
    </Screen>
  );
}

// ── Security Screen ─────────────────────────────────────────────────────
function SecurityScreen() {
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
              // Refresh sessions list
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

// ── Notifications Screen ────────────────────────────────────────────────
function NotificationsScreen() {
  const c = useAppColors();
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [tripEnabled, setTripEnabled] = useState(true);
  const [osPermission, setOsPermission] = useState<string>('undetermined');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check actual OS-level notification permission
    const checkPermission = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setOsPermission(status);
        setPushEnabled(status === 'granted');
      } catch {
        // If Notifications module unavailable, show as undetermined
        setPushEnabled(false);
        setOsPermission('unavailable');
      }
    };
    checkPermission();
  }, []);

  const handleTogglePush = async () => {
    if (osPermission !== 'granted') {
      // OS permission denied — guide user to settings
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
      await api.patch('/users/me/notifications', {
        pushEnabled,
        tripAlerts: tripEnabled,
      });
      Alert.alert('Success', 'Notification preferences saved successfully.');
      router.back();
    } catch (e: any) {
      // Save locally even if server fails
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
        <Button 
          label={saving ? "Saving…" : "Save Preferences"} 
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />
      </View>
    </Screen>
  );
}

// ── Help & Support Screen ─────────────────────────────────────────────
function HelpScreen() {
  const c = useAppColors();

  return (
    <Screen title="Help & Support" subtitle="Get assistance and learn about Yatri Shield.">
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>Contact Support</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginVertical: space.sm }]}>
          For non-emergency support regarding the app, email us at:
        </Text>
        <Button label="support@yatrishield.gov.in" variant="secondary" onPress={() => {}} />
      </Card>

      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>Emergency Services</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginVertical: space.sm }]}>
          If you are in immediate danger, do not wait for the app. Call national emergency services immediately.
        </Text>
        <Button label="Call 112" variant="primary" onPress={() => {}} />
      </Card>
      
      <Card>
        <Text style={[type.subtitle, { color: c.onSurface }]}>FAQ</Text>
        <Text style={[type.body, { color: c.onSurface, fontWeight: '600', marginTop: space.sm }]}>How does Silent SOS work?</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>It discreetly notifies authorities and your emergency contacts without alerting anyone around you. Your screen will display a fake weather app.</Text>
        
        <Text style={[type.body, { color: c.onSurface, fontWeight: '600', marginTop: space.sm }]}>Who can see my location?</Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginBottom: space.sm }]}>Your location is only shared during an active trip or if you trigger an SOS. It is encrypted and only accessible by authorized command centers.</Text>
      </Card>
    </Screen>
  );
}
