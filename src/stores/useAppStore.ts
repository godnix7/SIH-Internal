import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { storage } from '@/src/lib/storage';

import i18n, { LANGUAGE_KEY, savedLanguage, type Language } from '@/src/i18n';
import { SOS_CANCEL_PIN, remoteConfig } from '@/src/lib/constants';
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
import { flushOutbox, tripApi, zoneApi } from '@/src/services/api';
import { locationEngine } from '@/src/services/locationEngine';
import { preferences } from '@/src/services/preferences';

const SOS_KEY = 'yatri-shield.active-sos.v1';
// The event chain can exceed SecureStore's value limit, so it lives in MMKV beside the record.
const SOS_EVENTS_KEY = 'yatri-shield.active-sos-events.v1';

const zones: Zone[] = [
  {
    id: 'jaipur-advisory',
    class: 'advisory',
    name: 'Chandni Chowk after dark',
    version: 1,
    bufferM: 40,
    message:
      'Heads up: pickpocketing is reported around Chandni Chowk after dark. Keep valuables zipped. Nearest police aid post: 400 m.',
    polygon: [
      [
        [75.8245, 26.9248],
        [75.8264, 26.9248],
        [75.8264, 26.9265],
        [75.8245, 26.9265],
        [75.8245, 26.9248],
      ],
    ],
  },
  {
    id: 'sikkim-restricted',
    class: 'restricted',
    name: 'Sikkim border buffer',
    version: 3,
    bufferM: 200,
    message:
      'You have entered a restricted area. Turn back to exit the boundary. Authorities are notified only after a reliable, confirmed entry.',
    polygon: [
      [
        [88.7132, 27.7772],
        [88.7145, 27.7772],
        [88.7145, 27.7782],
        [88.7132, 27.7782],
        [88.7132, 27.7772],
      ],
    ],
  },
  {
    id: 'sahastra-corridor',
    class: 'corridor',
    name: 'Sahastra Tal corridor',
    version: 2,
    bufferM: 100,
    message:
      'You are off the planned trek corridor. Return to the marked route or check in with your group leader.',
    polygon: [
      [
        [78.552, 30.857],
        [78.568, 30.857],
        [78.568, 30.864],
        [78.552, 30.864],
        [78.552, 30.857],
      ],
    ],
  },
];

const initialAlerts: AlertItem[] = [
  {
    id: 'welcome',
    kind: 'system',
    title: 'Your safety choices stay visible',
    body: 'Check-ins are the default. You can change the tier for any trip at any time.',
    createdAt: Date.now(),
    severity: 'info',
  },
];

type Profile = {
  name: string;
  nationality: string;
  homeCity: string;
  idRef: string;
  language: Language;
};

type AppStore = {
  hasCompletedOnboarding: boolean;
  online: boolean;
  language: Language;
  profile?: Profile;
  trips: Trip[];
  alerts: AlertItem[];
  sos?: SOSRecord;
  incidentEvents: IncidentEvent[];
  theme: 'system' | 'light' | 'dark';
  isAuthenticated: boolean;
  userId?: string;
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
  updateTripTier: (tripId: string, tier: ConsentTier) => Promise<void>;
  endTrip: (tripId: string) => void;
  addAlert: (alert: Omit<AlertItem, 'id' | 'createdAt'>) => void;
  beginSos: (type: SOSRecord['type'], silent: boolean, location?: Coordinates) => Promise<void>;
  sendSos: () => Promise<void>;
  setSosStatus: (status: SOSStatus) => Promise<void>;
  cancelSos: (pin: string) => Promise<boolean>;
  resolveSos: () => Promise<void>;
  restoreSos: () => Promise<void>;
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
  userId: undefined,
  hydrateAuth: async () => {
    const token = await storage.getAccessToken();
    if (token) {
      set({ isAuthenticated: true });
    }
  },
  login: (userId) => set({ isAuthenticated: true, userId }),
  logout: async () => {
    await storage.clearTokens();
    set({ isAuthenticated: false, userId: undefined });
  },
  hasCompletedOnboarding: preferences.getBoolean('onboarding.completed') ?? false,
  online: true,
  profile: undefined,
  trips: [],
  alerts: initialAlerts,
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
  createTrip: async (values) => {
    try {
      const backendTrip = await tripApi.createTrip(values);
      const trip: Trip = {
        id: backendTrip.id,
        ...values,
        status: backendTrip.status,
        nextCheckInAt: Date.now() + 4 * 60 * 60_000,
        zones, // we could also call zoneApi.getZonePack() here or lazily
        partySize: values.partySize ?? 1,
      };

      // Attempt to fetch fresh zones if online
      if (get().online) {
        try {
          const freshZones = await zoneApi.getZonePack();
          trip.zones = freshZones.length > 0 ? freshZones : zones;
        } catch {
          // fallback to cached/initial zones
        }
      }

      await outboxQueue.enqueue(
        'trip.started',
        { tripId: trip.id, tier: trip.tier, destination: trip.destination },
        'CHECKIN',
      );
      set((state) => ({ trips: [trip, ...state.trips] }));
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
      if (get().online) {
        await tripApi.endTrip(tripId);
      }
      set((state) => ({
        trips: state.trips.map((trip) =>
          trip.id === tripId ? { ...trip, status: 'ended' } : trip,
        ),
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to end trip', error);
    }
  },
  addAlert: (alert) =>
    set((state) => ({
      alerts: [{ ...alert, id: uniqueId('alert'), createdAt: Date.now() }, ...state.alerts],
    })),
  beginSos: async (type, silent, location) => {
    const incidentId = uniqueId('incident');
    const sos: SOSRecord = {
      id: uniqueId('sos'),
      type,
      silent,
      status: 'COUNTDOWN',
      createdAt: Date.now(),
      location,
      incidentId,
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
        sosId: sos.id,
        incidentId: sos.incidentId,
        type: sos.type,
        silent: sos.silent,
        location: sos.location,
      },
      'SOS',
    );
    if (get().online) {
      void flushOutbox();
      await get().setSosStatus('SENT');
    }
  },
  setSosStatus: async (status) => {
    const sos = get().sos;
    if (!sos) return;
    const nextSos = { ...sos, status };
    const event = await appendEvent(
      get().incidentEvents,
      `sos.${status.toLowerCase()}`,
      status === 'ACKNOWLEDGED'
        ? 'operator'
        : status === 'RESPONDER_ENROUTE'
          ? 'responder'
          : 'system',
      { status },
    );
    const incidentEvents = [...get().incidentEvents, event];
    set({ sos: nextSos, incidentEvents });
    await persistSos(nextSos, incidentEvents);
    if (status === 'SENT')
      get().addAlert({
        kind: 'incident',
        severity: 'critical',
        title: 'SOS sent',
        body: 'Help is on the way. Your identity, location and medical card have reached the control room.',
      });
  },
  cancelSos: async (pin) => {
    if (pin !== SOS_CANCEL_PIN || !get().sos) return false;
    await get().setSosStatus('CANCELLED');
    await clearPersistedSos();
    await locationEngine.setEmergency(false);
    return true;
  },
  resolveSos: async () => {
    await get().setSosStatus('RESOLVED');
    await clearPersistedSos();
    await locationEngine.setEmergency(false);
  },
  restoreSos: async () => {
    const saved = await SecureStore.getItemAsync(SOS_KEY);
    if (!saved) return;
    const sos = JSON.parse(saved) as SOSRecord;
    if (['RESOLVED', 'CANCELLED'].includes(sos.status)) {
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
}));

export function activeTrip(trips: Trip[]): Trip | undefined {
  return trips.find((trip) => trip.status === 'active' || trip.status === 'paused');
}

/** A resolved or cancelled SOS stays in the store for its timeline; it is not live. */
export function isSosActive(sos?: SOSRecord): boolean {
  return sos !== undefined && sos.status !== 'RESOLVED' && sos.status !== 'CANCELLED';
}

export { zones, remoteConfig };
