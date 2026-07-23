import { Redirect } from 'expo-router';
import { useAppStore } from '@/src/stores/useAppStore';

export default function Index() {
  const complete = useAppStore((state) => state.hasCompletedOnboarding);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!complete) {
    return <Redirect href="/welcome" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(onboarding)/phone" />;
  }

  return <Redirect href="/home" />;
}
