import { api } from '@/src/services/api';
import type { HealthcareFacility } from './HealthcareDiscovery';
import { evaluateZoneCandidate } from '@/src/lib/geo';
import { useAppStore } from '@/src/stores/useAppStore';

export interface RoutePolyline {
  coordinates: [number, number][]; // [lon, lat] for MapLibre
  distanceMeter: number;
  durationSeconds: number;
  safe: boolean;
  warnings?: string[];
  routeType: 'online_pedestrian' | 'offline_straight_line';
}

class HealthcareRouterService {
  /**
   * Calculate a route to a healthcare facility.
   * Online: Calls backend routing proxy (which calls Mapbox/OSM).
   * Offline: Simple straight line for now (since full offline routing requires GraphHopper/OSRM local setup).
   */
  public async getRoute(
    startLat: number,
    startLon: number,
    destination: HealthcareFacility,
    online: boolean,
  ): Promise<RoutePolyline | null> {
    if (!online) {
      // Offline fallback: draw a straight line

      let safe = true;
      let warnings: string[] = [];
      const zones = useAppStore.getState().zones;
      const disasterZones = zones.filter((z: any) => z.class === 'disaster');

      for (const z of disasterZones) {
        if (
          evaluateZoneCandidate(z, {
            latitude: destination.location.lat,
            longitude: destination.location.lon,
            accuracy: 0,
            timestamp: 0,
          }) === 'inside'
        ) {
          safe = false;
          warnings.push(`Warning: Destination is inside disaster zone: ${z.name}`);
        }
      }

      return {
        coordinates: [
          [startLon, startLat],
          [destination.location.lon, destination.location.lat],
        ],
        distanceMeter: destination.distanceMeter || 0,
        durationSeconds: (destination.distanceMeter || 0) / 1.4, // Assume walking speed 1.4 m/s
        safe,
        warnings,
        routeType: 'offline_straight_line',
      };
    }

    try {
      const response = await api.get('/healthcare/route', {
        params: {
          startLat,
          startLon,
          destLat: destination.location.lat,
          destLon: destination.location.lon,
        },
      });
      return { ...response.data.route, routeType: 'online_pedestrian' };
    } catch (e) {
      console.error('[HealthcareRouter] Failed to fetch route:', e);
      return null;
    }
  }
}

export const HealthcareRouter = new HealthcareRouterService();
