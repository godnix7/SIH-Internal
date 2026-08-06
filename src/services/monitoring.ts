import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';

import { remoteConfig } from '@/src/lib/constants';
import type { ConsentTier, Trip } from '@/src/lib/types';
import { locationEngine, isCritical, type SamplingPlan } from './locationEngine';

const TASK_NAME = 'yatri-shield-location-task';

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
  const trip = activeMonitoringTrip;
  if (!trip) return;
  for (const location of locations) {
    const evaluations = await locationEngine.ingestFix(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 999,
        timestamp: location.timestamp,
      },
      trip.zones,
    );
    for (const evalResult of evaluations) {
      if (evalResult.confirmed && evalResult.state === 'inside' && isCritical(evalResult.zone)) {
        const score = evalResult.zone.safetyScore ?? evalResult.zone.safety_score ?? 100;
        const bodyMsg =
          score < 50
            ? `WARNING: Entered ${evalResult.zone.name} with low Safety Score (${score}/100). ${evalResult.zone.message || 'Proceed with maximum caution or evacuate immediately.'}`
            : `Restricted perimeter entered: ${evalResult.zone.name}. Police have been notified of your coordinates.`;
        void Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Geofence Safety Alert',
            body: bodyMsg,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      }
    }
  }
});

let activeMonitoringTrip: Trip | undefined;
let subscriptions: { remove: () => void }[] = [];
let unsubscribeEngine: (() => void) | undefined;
let appliedPlan: SamplingPlan | undefined;

const ACCURACY_BY_MODE: Record<SamplingPlan['accuracy'], Location.LocationAccuracy> = {
  none: Location.Accuracy.Lowest,
  low: Location.Accuracy.Low,
  balanced: Location.Accuracy.Balanced,
  high: Location.Accuracy.High,
  highest: Location.Accuracy.BestForNavigation,
};

export async function requestTripPermissions(
  tier: ConsentTier,
): Promise<{ foreground: boolean; background: boolean; notifications: boolean }> {
  const notification = await Notifications.requestPermissionsAsync();
  if (tier === 'off' || tier === 'checkins') {
    return {
      foreground: false,
      background: false,
      notifications: notification.granted,
    };
  }
  const foreground = await Location.requestForegroundPermissionsAsync();
  let background = { granted: false } as Location.PermissionResponse;
  if (foreground.granted) background = await Location.requestBackgroundPermissionsAsync();
  return {
    foreground: foreground.granted,
    background: background.granted,
    notifications: notification.granted,
  };
}

function samePlan(a: SamplingPlan | undefined, b: SamplingPlan): boolean {
  return a?.intervalSeconds === b.intervalSeconds && a?.accuracy === b.accuracy;
}

/** Restarts the OS subscription whenever the engine's mode changes what it should request. */
async function applyPlan(trip: Trip): Promise<void> {
  const plan = locationEngine.samplingPlan();
  if (plan.intervalSeconds <= 0 || samePlan(appliedPlan, plan)) return;
  appliedPlan = plan;
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME))
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: ACCURACY_BY_MODE[plan.accuracy],
    timeInterval: plan.intervalSeconds * 1_000,
    distanceInterval: 30,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Other,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Yatri Shield is watching over your trip',
      notificationBody: `${trip.destination} · next check-in is scheduled`,
      notificationColor: '#1F6F54',
    },
  });
}

function startMotionGating(): void {
  const { stillnessToleranceG, sampleIntervalMs } = remoteConfig.motion;
  Accelerometer.setUpdateInterval(sampleIntervalMs);
  subscriptions.push(
    Accelerometer.addListener(({ x, y, z }) => {
      // At rest the magnitude sits at ~1 g regardless of orientation.
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      locationEngine.setMoving(Math.abs(magnitude - 1) > stillnessToleranceG);
    }),
  );
}

/** Reads the live power state each time: charging status must never be captured once. */
async function pushBatteryState(): Promise<void> {
  const state = await Battery.getPowerStateAsync();
  await locationEngine.setBatteryLevel(
    state.batteryLevel,
    state.batteryState === Battery.BatteryState.CHARGING,
  );
}

async function startBatteryWatch(): Promise<void> {
  await pushBatteryState();
  subscriptions.push(Battery.addBatteryLevelListener(() => void pushBatteryState()));
  subscriptions.push(Battery.addBatteryStateListener(() => void pushBatteryState()));
}

export async function startMonitoring(trip: Trip): Promise<void> {
  activeMonitoringTrip = trip;
  locationEngine.setTier(trip.tier);
  if (trip.tier === 'off' || trip.tier === 'checkins') return;
  appliedPlan = undefined;
  await locationEngine.setTripActive(true);
  await applyPlan(trip);
  startMotionGating();
  await startBatteryWatch();
  // The engine changes mode on its own (risk, battery, SOS, stillness); follow it.
  unsubscribeEngine = locationEngine.subscribe(() => {
    if (activeMonitoringTrip) void applyPlan(activeMonitoringTrip);
  });
}

export async function stopMonitoring(): Promise<void> {
  activeMonitoringTrip = undefined;
  unsubscribeEngine?.();
  unsubscribeEngine = undefined;
  subscriptions.forEach((subscription) => subscription.remove());
  subscriptions = [];
  appliedPlan = undefined;
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME))
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  await locationEngine.setTripActive(false);
}
