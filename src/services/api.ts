import axios from 'axios';
import { storage } from '@/src/lib/storage';
import { outboxQueue } from './outboxQueue';
import { meshService } from './mesh';
import { smsCrypto } from './smsCrypto';
import { router } from 'expo-router';

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://yatri-shield-api.onrender.com/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach access token
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Handle 401s and automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and it's not a retry or auth endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        // Queue the request if refresh is currently happening
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        processQueue(new Error('No refresh token'), null);
        // Dispatch logout event here
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        await storage.setTokens(accessToken, newRefreshToken, (await storage.getSosToken()) ?? '');

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await storage.clearTokens();
        try {
          const { useAppStore } = require('../stores/useAppStore');
          useAppStore.getState().logout();
        } catch (e) {
          console.error('Failed to clear store on logout', e);
        }
        router.replace('/(onboarding)/phone');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export const tripApi = {
  getTrips: async () => {
    const res = await api.get('/trips');
    return res.data;
  },
  createTrip: async (data: any) => {
    const payload = {
      destination: data.destination,
      start_date: data.startDate,
      end_date: data.endDate,
      consent_tier: data.tier,
      party_size: data.partySize || 1,
    };
    const res = await api.post('/trips', payload);
    return res.data;
  },
  startTrip: async (tripId: string) => {
    const res = await api.post(`/trips/${tripId}/start`);
    return res.data;
  },
  updateTier: async (tripId: string, tier: string) => {
    const res = await api.put(`/trips/${tripId}/tier`, { consent_tier: tier });
    return res.data;
  },
  endTrip: async (tripId: string) => {
    const res = await api.post(`/trips/${tripId}/end`);
    return res.data;
  },
};

export const zoneApi = {
  getZonePack: async () => {
    const res = await api.get('/zones/pack');
    const rawZones = Array.isArray(res.data) ? res.data : [];
    return rawZones.map((z: any) => ({
      id: String(z.id || Math.random()),
      class: (z.zone_class || z.class || 'advisory') as any,
      name: z.name || 'Safety Geofence Zone',
      version: Number(z.version || 1),
      bufferM: Number(
        z.buffer_m !== undefined ? z.buffer_m : z.bufferM !== undefined ? z.bufferM : 100,
      ),
      message: strOr(z.description, z.message, 'Geofenced area monitored by local authorities.'),
      schedule: z.schedule,
      polygon: z.geometry_geojson?.coordinates ||
        z.polygon || [
          [
            [77.5946, 12.9716],
            [77.6046, 12.9716],
            [77.6046, 12.9816],
            [77.5946, 12.9816],
            [77.5946, 12.9716],
          ],
        ],
      safetyScore: Number(
        z.safety_score !== undefined
          ? z.safety_score
          : z.safetyScore !== undefined
            ? z.safetyScore
            : 100,
      ),
      safety_score: Number(
        z.safety_score !== undefined
          ? z.safety_score
          : z.safetyScore !== undefined
            ? z.safetyScore
            : 100,
      ),
      riskFactors: Array.isArray(z.risk_factors)
        ? z.risk_factors
        : Array.isArray(z.riskFactors)
          ? z.riskFactors
          : [],
      risk_factors: Array.isArray(z.risk_factors)
        ? z.risk_factors
        : Array.isArray(z.riskFactors)
          ? z.riskFactors
          : [],
    }));
  },
};

function strOr(val1: any, val2: any, defaultStr: string): string {
  if (typeof val1 === 'string' && val1.trim()) return val1;
  if (typeof val2 === 'string' && val2.trim()) return val2;
  return defaultStr;
}

export const locationApi = {
  uploadBatch: async (batchId: string, data: any) => {
    const res = await api.post('/locations/batch', data, {
      headers: { 'Idempotency-Key': batchId },
    });
    return res.data;
  },
};

export const identityApi = {
  submitKyc: async (data: {
    type: string;
    digilockerToken?: string;
    mrzData?: string;
    photoBase64?: string;
  }) => {
    const res = await api.post('/identity/verify', data);
    return res.data;
  },
};

export const userApi = {
  getProfile: async () => {
    const res = await api.get('/users/me');
    return res.data;
  },
  getDigitalId: async () => {
    const res = await api.get('/users/me/id');
    return res.data;
  },
  getMedicalCard: async () => {
    const res = await api.get('/users/me/medical');
    return res.data;
  },
  updateMedicalCard: async (data: any) => {
    const res = await api.patch('/users/me/medical', data);
    return res.data;
  },
  getEmergencyContacts: async () => {
    const res = await api.get('/users/me/contacts');
    return res.data;
  },
  createEmergencyContact: async (data: any) => {
    const res = await api.post('/users/me/contacts', data);
    return res.data;
  },
  deleteEmergencyContact: async (id: string) => {
    const res = await api.delete(`/users/me/contacts/${id}`);
    return res.data;
  },
};

export const sosApi = {
  triggerSos: async (data: any, idempotencyKey: string) => {
    const res = await api.post('/sos', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },
  cancelSos: async (sosId: string, data: any) => {
    const res = await api.post(`/sos/${sosId}/cancel`, data);
    return res.data;
  },
};

export type FlushResult = { sent: number; failed: number; sentTypes: string[] };

let isFlushing = false;

export async function flushOutbox(): Promise<FlushResult> {
  if (isFlushing) return { sent: 0, failed: 0, sentTypes: [] };
  isFlushing = true;
  try {
    const due = await outboxQueue.due();
    const sentTypes: string[] = [];
    let sent = 0;
    let failed = 0;

    // Group locations
    const locations = due.filter((i) => i.type === 'location');
    const otherEvents = due.filter((i) => i.type !== 'location');

    if (locations.length > 0) {
      // Dynamic import to avoid circular dependency if useAppStore imports api
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useAppStore } = require('../stores/useAppStore');
      const state = useAppStore.getState();
      const activeTrip = state.trips.find((t: any) => t.status === 'active');

      if (activeTrip) {
        try {
          const batchId = locations[0].id; // Use first item's ID as idempotency key
          const points = locations.map((loc) => ({
            lat: loc.payload.lat,
            lon: loc.payload.lng, // map lng to lon
            accM: loc.payload.accuracy || 10,
            sampledAt: loc.payload.timestamp,
          }));

          await locationApi.uploadBatch(batchId, {
            tripId: activeTrip.id,
            points,
          });

          for (const loc of locations) {
            await outboxQueue.acknowledge(loc.id);
            sentTypes.push('location');
            sent += 1;
          }
        } catch {
          for (const loc of locations) {
            await outboxQueue.retry(loc);
            failed += 1;
          }
        }
      } else {
        // If no active trip, just acknowledge to clear them
        for (const loc of locations) {
          await outboxQueue.acknowledge(loc.id);
          sent += 1;
        }
      }
    }

    for (const item of otherEvents) {
      try {
        if (item.type === 'sos.triggered') {
          const res = await sosApi.triggerSos(item.payload, item.id);
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useAppStore } = require('../stores/useAppStore');
          const state = useAppStore.getState();
          if (
            state.sos &&
            (state.sos.id === item.id || state.sos.id === (item.payload as any).clientSosId)
          ) {
            useAppStore.setState({
              sos: { ...state.sos, id: res.sosId, incidentId: res.incidentId },
            });
          }
        } else if (item.type === 'media.upload' || item.type === 'media') {
          await api.post(
            '/events/media/sync',
            { ...item.payload, original_capture_timestamp: item.createdAt },
            {
              headers: { 'Idempotency-Key': item.id },
            },
          );
        } else {
          await api.post('/events', item, {
            headers: { 'Idempotency-Key': item.id },
          });
        }
        await outboxQueue.acknowledge(item.id);
        sentTypes.push(item.type);
        sent += 1;
      } catch {
        await outboxQueue.retry(item);
        failed += 1;

        // Phase 8: Offline SMS Fallback for SOS
        if (item.type === 'sos.triggered') {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const SMS = require('expo-sms');
          const isAvailable = await SMS.isAvailableAsync();
          if (isAvailable) {
            const lat = (item.payload as any).location?.lat || 0;
            const lon = (item.payload as any).location?.lon || 0;
            const acc = (item.payload as any).location?.accM || 0;
            const ts = (item.payload as any).location?.ts || new Date().toISOString();

            const rawPayload = `SOS|v1|${item.id}|${lat}|${lon}|${acc}|${new Date(ts).getTime()}`;
            const payload = smsCrypto.encrypt(rawPayload);

            // The government emergency shortcode
            await SMS.sendSMSAsync(['112'], payload);

            // Phase 5.2: Activate BLE Mesh Broadcasting
            await meshService.startBroadcastingSOS(item.id, lat, lon);
          } else {
            // If SMS is not available (e.g. iPad, no SIM), immediately rely on BLE Mesh
            const lat = (item.payload as any).location?.lat || 0;
            const lon = (item.payload as any).location?.lon || 0;
            await meshService.startBroadcastingSOS(item.id, lat, lon);
          }
        }
      }
    }
    return { sent, failed, sentTypes };
  } finally {
    isFlushing = false;
  }
}
