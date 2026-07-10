import '@/src/i18n';
import '@/src/services/monitoring';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts as useFrauncesFonts,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isSosActive, useAppStore } from '@/src/stores/useAppStore';
import { connectRealtime, type RemoteIncident } from '@/src/services/realtime';

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function SafetyRestorer() {
  const restoreSos = useAppStore((state) => state.restoreSos);
  useEffect(() => {
    void restoreSos().then(() => {
      if (isSosActive(useAppStore.getState().sos)) router.replace('/sos/active');
    });
  }, [restoreSos]);
  return null;
}

function RealtimeBridge() {
  const setSosStatus = useAppStore((state) => state.setSosStatus);
  useEffect(() => {
    const socket = connectRealtime((incident: RemoteIncident) => {
      const sos = useAppStore.getState().sos;
      if (!sos || sos.incidentId !== incident.id) return;
      const next =
        incident.status === 'acknowledged'
          ? 'ACKNOWLEDGED'
          : incident.status === 'responder_enroute'
            ? 'RESPONDER_ENROUTE'
            : incident.status === 'resolved'
              ? 'RESOLVED'
              : 'SENT';
      if (sos.status !== next) void setSosStatus(next);
    });
    return () => {
      socket.disconnect();
    };
  }, [setSosStatus]);
  return null;
}

export default function RootLayout() {
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [frauncesLoaded, frauncesError] = useFrauncesFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (interError || frauncesError) {
    }
  }, [interError, frauncesError]);

  if (!interLoaded && !interError) return <View />;
  if (!frauncesLoaded && !frauncesError) return <View />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SafetyRestorer />
        <RealtimeBridge />
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trip/new" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="sos/active"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="incident/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
