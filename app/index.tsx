import { Redirect } from 'expo-router';
import { useAppStore } from '@/src/stores/useAppStore';

export default function Index() {
  const complete = useAppStore((state) => state.hasCompletedOnboarding);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const hasSetPin = useAppStore((state) => state.hasSetPin);

  if (isAuthenticated) {
    if (!hasSetPin) {
      return <Redirect href="/(onboarding)/pin" />;
    }
    if (!complete) {
      return <Redirect href="/offline-maps" />;
    }
    return <Redirect href="/home" />;
  }

  if (!complete) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/(onboarding)/phone" />;
}
