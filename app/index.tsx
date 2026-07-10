import { Redirect } from 'expo-router';
import { useAppStore } from '@/src/stores/useAppStore';

export default function Index() {
  const complete = useAppStore((state) => state.hasCompletedOnboarding);
  return <Redirect href={complete ? '/home' : '/welcome'} />;
}
