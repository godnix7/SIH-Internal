import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Use the real access token from localStorage for authentication
apiClient.interceptors.request.use((config) => {
  // We only run this on the client side
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const getIncidents = async () => {
  const response = await apiClient.get('/incidents');
  return response.data;
};

export const getAllIncidents = async (statusFilter = 'all') => {
  const response = await apiClient.get('/incidents', { params: { status_filter: statusFilter } });
  return response.data;
};

export const acknowledgeIncident = async (id: string) => {
  const response = await apiClient.post(`/incidents/${id}/acknowledge`, {});
  return response.data;
};

export const arriveIncident = async (id: string) => {
  const response = await apiClient.post(`/incidents/${id}/arrive`);
  return response.data;
};

export const requestResolve = async (id: string) => {
  const response = await apiClient.post(`/incidents/${id}/request_resolve`);
  return response.data;
};

export const resolveIncident = async (id: string, otp: string) => {
  const response = await apiClient.post(`/incidents/${id}/resolve`, { otp });
  return response.data;
};

export const closeIncident = async (id: string) => {
  const response = await apiClient.post(`/incidents/${id}/close`);
  return response.data;
};

export const assignIncident = async (id: string, unitId: string) => {
  const response = await apiClient.post(`/incidents/${id}/assign`, { unitId });
  return response.data;
};

export const escalateIncident = async (id: string, reason: string) => {
  const response = await apiClient.post(`/incidents/${id}/escalate`, { reason });
  return response.data;
};

export const scanQR = async (qrToken: string) => {
  const response = await apiClient.post(`/identity/scan`, { qrToken });
  return response.data;
};

export const getAnalyticsOverview = async () => {
  const response = await apiClient.get('/analytics/overview');
  return response.data;
};

export const getSystemHealth = async () => {
  const response = await apiClient.get('/system/health');
  return response.data;
};

export const getInternalUsers = async () => {
  const response = await apiClient.get('/system/users/internal');
  return response.data;
};

export const deleteInternalUser = async (userId: string) => {
  const response = await apiClient.delete(`/system/admin/users/${userId}`);
  return response.data;
};

export const updateInternalUser = async (
  userId: string,
  data: {
    name?: string;
    phone?: string;
    organization?: string;
    role?: string;
    status?: string;
  },
) => {
  const response = await apiClient.put(`/system/admin/users/${userId}`, data);
  return response.data;
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
  const response = await apiClient.post(`/system/admin/users/${userId}/reset-password`, {
    newPassword,
  });
  return response.data;
};

export const broadcastAlert = async (zone: string, message: string) => {
  const response = await apiClient.post(`/system/broadcast`, { zone, message });
  return response.data;
};

// Zone management APIs
export const getZones = async () => {
  const response = await apiClient.get('/zones/all');
  return response.data;
};

export const getZoneSafetyScores = async () => {
  const response = await apiClient.get('/zones/safety-scores');
  return response.data;
};

export const createZone = async (data: {
  name: string;
  zone_class: string;
  buffer_m: number;
  description?: string;
  geometry_geojson: any;
  crime_data?: any[];
  risk_factors?: string[];
  safety_score?: number;
}) => {
  const response = await apiClient.post('/zones/', data);
  return response.data;
};

export const updateZone = async (
  zoneId: string,
  data: {
    name?: string;
    zone_class?: string;
    buffer_m?: number;
    description?: string;
    status?: string;
    crime_data?: any[];
    risk_factors?: string[];
    safety_score?: number;
  },
) => {
  const response = await apiClient.put(`/zones/${zoneId}`, data);
  return response.data;
};

export const deleteZone = async (zoneId: string) => {
  const response = await apiClient.delete(`/zones/${zoneId}`);
  return response.data;
};
