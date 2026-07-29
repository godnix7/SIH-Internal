import type { ConsentTier, ModeAccuracy, MonitoringMode, QueuePriority } from './types';

export const remoteConfig = {
  version: 1,
  geofence: {
    restrictedAccuracyM: 30,
    advisoryAccuracyM: 75,
    consecutiveFixes: 2,
    cooldownMs: 5 * 60 * 1000,
  },
  motion: {
    /** Accelerometer magnitude may drift this far from 1 g and still count as still. */
    stillnessToleranceG: 0.05,
    sampleIntervalMs: 2_000,
    /** Stationary this long in ACTIVE_TRIP stretches GPS to `stationaryGpsSeconds`. */
    stationaryAfterMs: 10 * 60_000,
    stationaryGpsSeconds: 300,
  },
  battery: {
    /** Below this, and not charging, the engine drops to LOW_BATTERY. */
    lowLevel: 0.15,
    /** Hysteresis: climb back above this before leaving LOW_BATTERY. */
    recoveredLevel: 0.2,
  },
  modes: {
    IDLE: { gpsSeconds: 0, syncSeconds: 0, accuracy: 'none' },
    ACTIVE_TRIP: { gpsSeconds: 60, syncSeconds: 7 * 60, accuracy: 'balanced' },
    HIGH_RISK: { gpsSeconds: 20, syncSeconds: 2 * 60, accuracy: 'high' },
    EMERGENCY: { gpsSeconds: 3, syncSeconds: 0, accuracy: 'highest' },
    LOW_BATTERY: { gpsSeconds: 240, syncSeconds: 20 * 60, accuracy: 'low' },
  } satisfies Record<
    MonitoringMode,
    { gpsSeconds: number; syncSeconds: number; accuracy: ModeAccuracy }
  >,
  tiers: {
    off: { locationsStored: false, restrictedEventsUploaded: false },
    checkins: { locationsStored: false, restrictedEventsUploaded: false },
    zones: { locationsStored: false, restrictedEventsUploaded: true },
    full: { locationsStored: true, restrictedEventsUploaded: true },
  } satisfies Record<ConsentTier, { locationsStored: boolean; restrictedEventsUploaded: boolean }>,
};

export const priorityRank: Record<QueuePriority, number> = {
  SOS: 0,
  GEOFENCE_CRITICAL: 1,
  CHECKIN: 2,
  LOCATION_BATCH: 3,
  MEDIA: 4,
};

export const SMS_SHORTCODE = '78112';
export const EMERGENCY_NUMBER = '112';
export const OFFLINE_RETRY_MS = 10_000;
