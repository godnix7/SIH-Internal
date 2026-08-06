import '@/src/i18n';
import '@/src/services/monitoring';
import { useEffect, useState } from 'react';
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
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isSosActive, useAppStore, activeTrip } from '@/src/stores/useAppStore';
import { connectRealtime, type RemoteIncident } from '@/src/services/realtime';
import { meshService } from '@/src/services/mesh';
import { escalationManager } from '@/src/services/escalationManager';
import { aiEngine } from '@/src/services/aiEngine';
import { VerificationPrompt } from '@/src/components/VerificationPrompt';
import { CustomSplashScreen } from '@/src/components/SplashScreen';

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function PinGuard() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const hasSetPin = useAppStore((state) => state.hasSetPin);
  const segments = useSegments();
  const rootNav = router.canGoBack(); // simple check if router is mounted

  useEffect(() => {
    if (!isAuthenticated) return;
    if (segments[0] === '(onboarding)') return;
    if (!hasSetPin) {
      // Small timeout ensures layout is fully mounted before replacing
      setTimeout(() => {
        router.replace('/(onboarding)/pin' as any);
      }, 10);
    }
  }, [isAuthenticated, hasSetPin, segments]);
  return null;
}

function SafetyRestorer() {
  const restoreSos = useAppStore((state) => state.restoreSos);
  const restoreTrips = useAppStore((state) => state.restoreTrips);
  useEffect(() => {
    restoreTrips();
    void restoreSos().then(() => {
      if (isSosActive(useAppStore.getState().sos)) router.replace('/sos/active');
    });
  }, [restoreSos, restoreTrips]);
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
            : incident.status === 'responder_arrived'
              ? 'RESPONDER_ARRIVED'
              : incident.status === 'resolve_pending'
                ? 'RESOLVE_PENDING'
                : incident.status === 'resolved'
                  ? 'RESOLVED'
                  : 'SENT';
      if (sos.status !== next || (incident as any).otp) {
        void setSosStatus(next as any, (incident as any).otp);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [setSosStatus]);
  return null;
}

function MeshBridge() {
  useEffect(() => {
    // Start scanning for nearby SOS beacons in the background
    meshService.startScanningForRelays();
    return () => {
      meshService.stopScanning();
    };
  }, []);
  return null;
}

function AIEngineBridge() {
  const trips = useAppStore((state) => state.trips);

  useEffect(() => {
    const currentTrip = activeTrip(trips);

    // Only monitor the accelerometer/sensors if the user is on an active trip
    if (currentTrip) {
      escalationManager.initialize();
      aiEngine.startMonitoring();
    } else {
      aiEngine.stopMonitoring();
    }

    return () => {
      aiEngine.stopMonitoring();
    };
  }, [trips]);

  return null;
}

import { SplashScreen } from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
  const [authHydrated, setAuthHydrated] = useState(false);
  const hydrateAuth = useAppStore((state) => state.hydrateAuth);
  const fetchZones = useAppStore((state) => state.fetchZones);

  useEffect(() => {
    Promise.all([hydrateAuth(), fetchZones()]).finally(() => setAuthHydrated(true));
  }, [hydrateAuth, fetchZones]);

  useEffect(() => {
    if (interLoaded || interError) {
      if (frauncesLoaded || frauncesError) {
        if (authHydrated) {
          // Hide the splash screen after the fonts and auth state have loaded
          SplashScreen.hideAsync();
        }
      }
    }
  }, [interLoaded, interError, frauncesLoaded, frauncesError, authHydrated]);

  if ((!interLoaded && !interError) || (!frauncesLoaded && !frauncesError) || !authHydrated) {
    return <CustomSplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SafetyRestorer />
        <PinGuard />
        <RealtimeBridge />
        <MeshBridge />
        <AIEngineBridge />
        <VerificationPrompt />
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
          <Stack.Screen name="identity/card" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
