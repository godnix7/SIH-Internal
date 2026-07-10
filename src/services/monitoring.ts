import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

import type { ConsentTier, Trip } from '@/src/lib/types';
import { locationEngine } from './locationEngine';

const TASK_NAME = 'yatri-shield-location-task';

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
  const trip = activeMonitoringTrip;
  if (!trip) return;
  for (const location of locations) {
    await locationEngine.ingestFix(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 999,
        timestamp: location.timestamp,
      },
      trip.zones,
      true,
    );
  }
});

let activeMonitoringTrip: Trip | undefined;

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

export async function startMonitoring(trip: Trip): Promise<void> {
  activeMonitoringTrip = trip;
  locationEngine.setTier(trip.tier);
  if (trip.tier === 'off' || trip.tier === 'checkins') return;
  const enabled = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (enabled) await Location.stopLocationUpdatesAsync(TASK_NAME);
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: trip.tier === 'full' ? Location.Accuracy.Balanced : Location.Accuracy.Low,
    timeInterval: 60_000,
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
  await locationEngine.transition('ACTIVE_TRIP', 'trip_started');
}

export async function stopMonitoring(): Promise<void> {
  activeMonitoringTrip = undefined;
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME))
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  await locationEngine.transition('IDLE', 'trip_ended');
}
