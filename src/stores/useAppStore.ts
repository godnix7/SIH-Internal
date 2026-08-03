import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { storage } from '@/src/lib/storage';

import i18n, { LANGUAGE_KEY, savedLanguage, type Language } from '@/src/i18n';
import { remoteConfig } from '@/src/lib/constants';
import { tierLabel } from '@/src/lib/formatters';
import { hashEvent } from '@/src/lib/hashChain';
import type {
  AlertItem,
  ConsentTier,
  Coordinates,
  IncidentEvent,
  SOSRecord,
  SOSStatus,
  Trip,
  Zone,
} from '@/src/lib/types';
import { outboxQueue } from '@/src/services/outboxQueue';
import { flushOutbox, tripApi, zoneApi, sosApi } from '@/src/services/api';
import { locationEngine } from '@/src/services/locationEngine';
import { preferences } from '@/src/services/preferences';
import * as Crypto from 'expo-crypto';

const SOS_KEY = 'yatri-shield.active-sos.v1';
// The event chain can exceed SecureStore's value limit, so it lives in MMKV beside the record.
const SOS_EVENTS_KEY = 'yatri-shield.active-sos-events.v1';
const TRIPS_KEY = 'yatri-shield.trips.v1';

function persistTrips(trips: Trip[]) {
  preferences.set(TRIPS_KEY, JSON.stringify(trips));
}

type Profile = {
  name: string;
  nationality: string;
  homeCity: string;
  idRef: string;
  language: Language;
  phone?: string;
  role?: string;
};

type AppStore = {
  hasCompletedOnboarding: boolean;
  online: boolean;
  language: Language;
  profile?: Profile;
  trips: Trip[];
  alerts: AlertItem[];
  sos?: SOSRecord;
  resolutionOtp?: string;
  incidentEvents: IncidentEvent[];
  zones: Zone[];
  fetchZones: () => Promise<void>;
  theme: 'system' | 'light' | 'dark';
  isAuthenticated: boolean;
  userId?: string;
  verificationPrompt?: { countdown: number; vector: any };
  isWearableConnected: boolean;
  setWearableConnected: (connected: boolean) => void;
  showVerificationPrompt: (countdown: number, vector: any) => void;
  clearVerificationPrompt: () => void;
  hydrateAuth: () => Promise<void>;
  login: (userId: string) => void;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
  setOnline: (online: boolean) => void;
  saveProfile: (profile: Omit<Profile, 'idRef' | 'language'>) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: AppStore['theme']) => void;
  createTrip: (
    values: Pick<Trip, 'destination' | 'startDate' | 'endDate' | 'tier'> &
      Partial<Pick<Trip, 'trek' | 'partySize' | 'monitoringLimited'>>,
  ) => Promise<Trip>;
  hasSetPin: boolean;
  setHasSetPin: (hasSet: boolean) => void;
  updateTripTier: (tripId: string, tier: ConsentTier) => Promise<void>;
  endTrip: (tripId: string) => void;
  addAlert: (alert: Omit<AlertItem, 'id' | 'createdAt'>) => void;
  beginSos: (type: SOSRecord['type'], silent: boolean, location?: Coordinates) => Promise<void>;
  sendSos: () => Promise<void>;
  setSosStatus: (status: SOSStatus, otp?: string) => Promise<void>;
  cancelSos: (pin: string) => Promise<boolean>;
  resolveSos: () => Promise<void>;
  restoreSos: () => Promise<void>;
  restoreTrips: () => Promise<void>;
};

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function appendEvent(
  current: IncidentEvent[],
  type: string,
  actor: IncidentEvent['actor'],
  payload: Record<string, unknown>,
): Promise<IncidentEvent> {
  const event = { id: uniqueId('evt'), type, actor, timestamp: Date.now(), payload };
  const prevHash = current.at(-1)?.hash ?? 'GENESIS';
  return { ...event, prevHash, hash: await hashEvent(prevHash, event) };
}

async function persistSos(sos: SOSRecord, incidentEvents: IncidentEvent[]): Promise<void> {
  await SecureStore.setItemAsync(SOS_KEY, JSON.stringify(sos));
  preferences.set(SOS_EVENTS_KEY, JSON.stringify(incidentEvents));
}

async function clearPersistedSos(): Promise<void> {
  await SecureStore.deleteItemAsync(SOS_KEY);
  preferences.remove(SOS_EVENTS_KEY);
}

export const useAppStore = create<AppStore>((set, get) => ({
  isAuthenticated: false,
  hasSetPin: false,
  setHasSetPin: (hasSet) => set({ hasSetPin: hasSet }),
  userId: undefined,
  verificationPrompt: undefined,
  isWearableConnected: false,
  setWearableConnected: (connected) => set({ isWearableConnected: connected }),
  showVerificationPrompt: (countdown, vector) => set({ verificationPrompt: { countdown, vector } }),
  clearVerificationPrompt: () => set({ verificationPrompt: undefined }),
  hydrateAuth: async () => {
    const token = await storage.getAccessToken();
    const pin = await storage.getDevicePin();
    if (token) {
      set({ isAuthenticated: true, hasSetPin: !!pin });
    }
  },
  login: (userId) => set({ isAuthenticated: true, userId }),
  logout: async () => {
    await storage.clearTokens();
    set({ isAuthenticated: false, userId: undefined, hasSetPin: false });
  },
  hasCompletedOnboarding: preferences.getBoolean('onboarding.completed') ?? false,
  online: true,
  profile: undefined,
  trips: [],
  alerts: [],
  zones: [],
  sos: undefined,
  incidentEvents: [],
  theme: (preferences.getString('theme') as AppStore['theme']) ?? 'system',
  completeOnboarding: () => {
    preferences.set('onboarding.completed', true);
    set({ hasCompletedOnboarding: true });
  },
  setOnline: (online) => {
    set({ online });
    if (!online) return;
    void flushOutbox().then(({ sentTypes }) => {
      const sos = get().sos;
      if (sos?.status === 'OFFLINE_QUEUED' && sentTypes.includes('sos.triggered'))
        void get().setSosStatus('SENT');
    });
  },
  saveProfile: (profile) =>
    set({
      profile: {
        ...profile,
        idRef: `YS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        language: savedLanguage(),
      },
    }),
  language: savedLanguage(),
  setLanguage: (language) => {
    preferences.set(LANGUAGE_KEY, language);
    void i18n.changeLanguage(language);
    set((state) => ({
      language,
      profile: state.profile ? { ...state.profile, language } : state.profile,
    }));
  },
  setTheme: (theme) => {
    preferences.set('theme', theme);
    set({ theme });
  },
  fetchZones: async () => {
    try {
      const freshZones = await zoneApi.getZonePack();
      if (freshZones && freshZones.length > 0) {
        set({ zones: freshZones });
      }
    } catch (e) {
      console.warn('Failed to fetch zones, using defaults', e);
    }
  },
  createTrip: async (values) => {
    try {
      const backendTrip = await tripApi.createTrip(values);
      const trip: Trip = {
        id: backendTrip.id,
        ...values,
        status: backendTrip.status,
        nextCheckInAt: Date.now() + 4 * 60 * 60_000,
        zones: get().zones, // Use fetched zones from state
        partySize: values.partySize ?? 1,
      };

      // Attempt to fetch fresh zones if online and not fetched yet
      if (get().online && get().zones.length === 0) {
        try {
          const freshZones = await zoneApi.getZonePack();
          trip.zones = freshZones.length > 0 ? freshZones : [];
          set({ zones: freshZones });
        } catch {
          // fallback to empty
        }
      }

      await outboxQueue.enqueue(
        'trip.started',
        { tripId: trip.id, tier: trip.tier, destination: trip.destination },
        'CHECKIN',
      );
      set((state) => {
        const newTrips = [trip, ...state.trips];
        persistTrips(newTrips);
        return { trips: newTrips };
      });
      return trip;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create trip', error);
      throw error;
    }
  },
  updateTripTier: async (tripId, tier) => {
    try {
      if (get().online) {
        await tripApi.updateTier(tripId, tier);
      }
      set((state) => ({
        trips: state.trips.map((trip) => (trip.id === tripId ? { ...trip, tier } : trip)),
      }));
      get().addAlert({
        kind: 'system',
        severity: 'info',
        title: 'Your choice was recorded',
        body: `Monitoring changed to ${tierLabel(tier)} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      });
      await outboxQueue.enqueue('consent.changed', { tripId, tier }, 'CHECKIN');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update trip tier', error);
    }
  },
  endTrip: async (tripId) => {
    try {
      if (get().online) await tripApi.endTrip(tripId);
    } catch {
      // Offline: handled later via sync if needed
    }
    set((state) => {
      const newTrips: Trip[] = state.trips.map((t): Trip =>
        t.id === tripId ? { ...t, status: 'ended' as const } : t,
      );
      persistTrips(newTrips);
      return { trips: newTrips };
    });
  },
  addAlert: (alert) =>
    set((state) => ({
      alerts: [{ ...alert, id: uniqueId('alert'), createdAt: Date.now() }, ...state.alerts],
    })),
  beginSos: async (type, silent, location) => {
    if (get().sos) return;
    // Check for an active trip
    const trip = activeTrip(get().trips);

    // Initial local record creation (client ID for idempotency)
    const clientSosId = Crypto.randomUUID();
    const sos: SOSRecord = {
      id: clientSosId,
      type,
      silent,
      status: 'COUNTDOWN',
      createdAt: Date.now(),
      location,
      incidentId: uniqueId('incident'),
    };
    const event = await appendEvent([], 'sos.created', 'you', { type, silent, location });
    set({ sos, incidentEvents: [event] });
    await persistSos(sos, [event]);
    // EMERGENCY outranks the battery saver, so this raises the sampling rate now.
    await locationEngine.setEmergency(true);
  },
  sendSos: async () => {
    const sos = get().sos;
    if (!sos) return;
    await get().setSosStatus(get().online ? 'SENDING' : 'OFFLINE_QUEUED');
    await outboxQueue.enqueue(
      'sos.triggered',
      {
        clientSosId: sos.id,
        tripId: activeTrip(get().trips)?.id || 'EMERGENCY_DIRECT',
        incidentId: sos.incidentId,
        type: sos.type,
        silent: sos.silent,
        location: sos.location
          ? {
              lat: sos.location.latitude,
              lon: sos.location.longitude,
              accM: sos.location.accuracy,
              ts: new Date(sos.location.timestamp).toISOString(),
            }
          : undefined,
      },
      'SOS',
    );
    if (get().online) {
      void flushOutbox();
      await get().setSosStatus('SENT');
    }
  },
  setSosStatus: async (status, otp) => {
    const { sos, incidentEvents } = get();
    if (!sos) return;
    const nextSos = { ...sos, status };
    const event = await appendEvent(
      incidentEvents,
      `sos.${status.toLowerCase()}`,
      status === 'ACKNOWLEDGED'
        ? 'operator'
        : status === 'RESPONDER_ENROUTE'
          ? 'responder'
          : 'system',
      { status },
    );
    const nextEvents = [...incidentEvents, event];
    set({ sos: nextSos, incidentEvents: nextEvents, resolutionOtp: otp ?? get().resolutionOtp });
    await persistSos(nextSos, nextEvents);
    if (status === 'SENT')
      get().addAlert({
        kind: 'incident',
        severity: 'critical',
        title: 'SOS sent',
        body: 'Help is on the way. Your identity, location and medical card have reached the control room.',
      });
  },
  cancelSos: async (pin) => {
    const storedPin = await storage.getDevicePin();
    const sos = get().sos;
    if (!storedPin || pin !== storedPin || !sos) return false;

    try {
      if (get().online) {
        await sosApi.cancelSos(sos.id, {
          reason: 'User verified safety via Safe PIN - Cancelled by User',
        });
      }
    } catch (e) {
      console.warn('Failed to notify backend of cancel', e);
    }

    await get().setSosStatus('CANCELLED_BY_USER');
    await clearPersistedSos();
    await locationEngine.setEmergency(false);
    set({ sos: undefined, incidentEvents: [] });
    return true;
  },
  resolveSos: async () => {
    await get().setSosStatus('RESOLVED');
    await clearPersistedSos();
    await locationEngine.setEmergency(false);
    set({ sos: undefined, incidentEvents: [] });
  },
  restoreSos: async () => {
    const saved = await SecureStore.getItemAsync(SOS_KEY);
    if (!saved) return;
    const sos = JSON.parse(saved) as SOSRecord;
    if (['RESOLVED', 'CANCELLED', 'CANCELLED_BY_USER'].includes(sos.status)) {
      await clearPersistedSos();
      return;
    }
    // A relaunch mid-SOS must come back in EMERGENCY, not ACTIVE_TRIP.
    await locationEngine.setEmergency(true);
    // Restoring the record without its chain would silently restart the hash chain at GENESIS.
    const savedEvents = preferences.getString(SOS_EVENTS_KEY);
    const incidentEvents = savedEvents ? (JSON.parse(savedEvents) as IncidentEvent[]) : [];
    set({ sos, incidentEvents });
  },
  restoreTrips: async () => {
    // 1. Load from MMKV immediately for fast UI
    const savedTrips = preferences.getString(TRIPS_KEY);
    if (savedTrips) {
      try {
        set({ trips: JSON.parse(savedTrips) });
      } catch {
        // ignore
      }
    }
    // 2. Sync from backend if online
    if (get().online) {
      try {
        const backendTrips = await tripApi.getTrips();
        // backendTrips is an array of TripResponse. Map to frontend Trip model
        const mappedTrips = backendTrips.map((bt: any) => ({
          id: bt.id,
          destination: bt.destination,
          startDate: bt.start_date,
          endDate: bt.end_date,
          tier: bt.consent_tier,
          status: bt.status,
          partySize: bt.party_size,
          // other frontend fields aren't strictly returned by simple GET /trips yet, but this suffices for the Trips page.
        }));
        persistTrips(mappedTrips);
        set({ trips: mappedTrips });
      } catch (e) {
        // Silent fail on sync
      }
    }
  },
}));

export function activeTrip(trips: Trip[]): Trip | undefined {
  return trips.find((trip) => trip.status === 'active' || trip.status === 'paused');
}

/** A resolved, cancelled, or false-alarm SOS stays in the store for its timeline; it is not live. */
export function isSosActive(sos?: SOSRecord): boolean {
  return (
    sos !== undefined &&
    sos.status !== 'RESOLVED' &&
    sos.status !== 'CANCELLED' &&
    sos.status !== 'CANCELLED_BY_USER' &&
    sos.status !== 'FALSE_ALARM'
  );
}

export { remoteConfig };
