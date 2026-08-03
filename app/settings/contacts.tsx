import { useState, useEffect } from 'react';
import { Alert, View, Text, ActivityIndicator } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, Input, ListRow, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { api } from '@/src/services/api';

export default function ContactsScreen() {
  const c = useAppColors();
  const [contacts, setContacts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadContacts = () => {
    api
      .get('/users/me/contacts')
      .then((res) => setContacts(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load contacts.'))
      .finally(() => setInitialLoading(false));
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAdd = async () => {
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number with at least 10 digits.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/users/me/contacts', {
        name,
        phone: normalizedPhone,
        relationship: relation,
        notifyTrip: true,
        notifyDailyOk: true,
      });
      setShowAdd(false);
      setName('');
      setPhone('');
      setRelation('');
      loadContacts();
    } catch (e: any) {
      console.error(e);
      if (!e.response) {
        Alert.alert(
          'No Connection',
          'Could not reach the server. Please check your internet connection.',
        );
      } else {
        Alert.alert(
          'Error',
          e.response?.data?.detail || 'Failed to add contact. Please try again.',
        );
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
            const previousContacts = [...contacts];
            setContacts(contacts.filter((c) => c.id !== id));
            try {
              await api.delete(`/users/me/contacts/${id}`);
            } catch (e) {
              setContacts(previousContacts);
              Alert.alert('Error', 'Failed to remove contact. The change has been reverted.');
              console.error(e);
            }
          },
        },
      ],
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
          contacts.map((contact) => (
            <View
              key={contact.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: space.sm,
              }}
            >
              <View style={{ flex: 1 }}>
                <ListRow title={contact.name} sub={`${contact.relationship} · ${contact.phone}`} />
              </View>
              <Button
                label="X"
                variant="secondary"
                onPress={() => handleDelete(contact.id, contact.name)}
              />
            </View>
          ))
        ) : (
          <Text style={{ color: c.onSurfaceVariant }}>
            No emergency contacts added yet. Adding at least one contact is recommended for trip
            safety.
          </Text>
        )}
        <Text style={[type.caption, { color: c.onSurfaceVariant, marginTop: space.sm }]}>
          You can silently remove any contact. They are never told that they were removed.
        </Text>
      </Card>

      {showAdd ? (
        <Card>
          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter contact's name"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <Input
            label="Relationship"
            value={relation}
            onChangeText={setRelation}
            placeholder="Enter relationship"
          />
          <Button
            label={loading ? 'Adding…' : 'Save Contact'}
            disabled={!name || !phone || !relation || loading}
            loading={loading}
            onPress={handleAdd}
          />
          <Button label="Cancel" variant="secondary" onPress={() => setShowAdd(false)} />
        </Card>
      ) : (
        <Button label="Add another contact" variant="secondary" onPress={() => setShowAdd(true)} />
      )}
    </Screen>
  );
}
