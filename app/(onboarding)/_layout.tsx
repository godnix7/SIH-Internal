import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signup" />
      <Stack.Screen name="kyc" />
      <Stack.Screen name="pin" />
      <Stack.Screen name="offline-maps" />
    </Stack>
  );
}
