import { api } from '@/src/services/api';

export type HealthcareFacilityType = 'hospital' | 'clinic' | 'pharmacy';

export interface HealthcareFacility {
  id: string;
  name: string;
  type: HealthcareFacilityType;
  location: {
    lat: number;
    lon: number;
  };
  address: string;
  phone?: string;
  isOpen?: boolean;
  rating?: number;
  distanceMeter?: number;
  cachedAt?: number;
  lastVerifiedAt?: number;
  expiresAt?: number;
}

class HealthcareDiscoveryService {
  /**
   * Search for nearby healthcare facilities via the backend proxy.
   * This abstracts away Google Places API keys from the React Native client.
   */
  public async searchNearby(
    lat: number,
    lon: number,
    radius: number = 5000, // 5km default
    type?: HealthcareFacilityType,
  ): Promise<HealthcareFacility[]> {
    try {
      const response = await api.get('/healthcare/nearby', {
        params: { lat, lon, radius, type },
      });
      return response.data.facilities;
    } catch (e) {
      console.error('[HealthcareDiscovery] Failed to fetch nearby facilities:', e);
      // Fallback or empty array
      return [];
    }
  }

  /**
   * Get detailed information about a specific facility (e.g., hours, phone).
   */
  public async getFacilityDetails(id: string): Promise<HealthcareFacility | null> {
    try {
      const response = await api.get(`/healthcare/facility/${id}`);
      return response.data;
    } catch (e) {
      console.error('[HealthcareDiscovery] Failed to fetch facility details:', e);
      return null;
    }
  }
}

export const HealthcareDiscovery = new HealthcareDiscoveryService();
