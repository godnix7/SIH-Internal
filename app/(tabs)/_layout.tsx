import { Tabs } from 'expo-router';
import { Bell, Home, Shield, UserRound, Compass } from 'lucide-react-native';
import type { AccessibilityState, GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useAppColors } from '@/src/components/ui';

type TabButtonProps = {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
};
function ShieldTabButton({
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityState,
  testID,
}: TabButtonProps) {
  const c = useAppColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Shield'}
      accessibilityState={accessibilityState}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.shield, { backgroundColor: c.signal }]}
    >
      <Shield color="#FFFFFF" size={25} />
    </Pressable>
  );
}
export default function TabLayout() {
  const c = useAppColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.trail,
        tabBarInactiveTintColor: c.slate,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.hairline,
          height: 70,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={21} /> }}
      />
      <Tabs.Screen
        name="trips"
        options={{ title: 'Trips', tabBarIcon: ({ color }) => <Compass color={color} size={21} /> }}
      />
      <Tabs.Screen
        name="shield"
        options={{
          title: 'Shield',
          tabBarButton: (props) => <ShieldTabButton {...props} />,
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarIcon: ({ color }) => <Bell color={color} size={21} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserRound color={color} size={21} />,
        }}
      />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  shield: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
