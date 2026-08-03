export type ConsentTier = 'off' | 'checkins' | 'zones' | 'full';
export type MonitoringMode = 'IDLE' | 'ACTIVE_TRIP' | 'HIGH_RISK' | 'EMERGENCY' | 'LOW_BATTERY';
/** Requested GPS accuracy per monitoring mode; mapped to Location.Accuracy at the OS boundary. */
export type ModeAccuracy = 'none' | 'low' | 'balanced' | 'high' | 'highest';
export type SOSStatus =
  | 'IDLE'
  | 'COUNTDOWN'
  | 'SENDING'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'RESPONDER_ENROUTE'
  | 'RESPONDER_ARRIVED'
  | 'RESOLVE_PENDING'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'CANCELLED_BY_USER'
  | 'FALSE_ALARM'
  | 'OFFLINE_QUEUED';
export type QueuePriority = 'SOS' | 'GEOFENCE_CRITICAL' | 'CHECKIN' | 'LOCATION_BATCH' | 'MEDIA';
export type ZoneClass = 'advisory' | 'restricted' | 'disaster' | 'corridor';

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export type Zone = {
  id: string;
  class: ZoneClass;
  name: string;
  version: number;
  bufferM: number;
  message: string;
  schedule?: { startHour: number; endHour: number };
  polygon: [number, number][][];
};

export type Trip = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  tier: ConsentTier;
  status: 'draft' | 'active' | 'paused' | 'ended';
  trek?: string;
  partySize?: number;
  /** True when the selected tier needs a permission that Android did not grant. */
  monitoringLimited?: boolean;
  nextCheckInAt: number;
  zones: Zone[];
};

export type AlertItem = {
  id: string;
  kind: 'zone' | 'checkin' | 'risk' | 'incident' | 'system';
  title: string;
  body: string;
  createdAt: number;
  severity: 'info' | 'warning' | 'critical';
};

export type IncidentEvent = {
  id: string;
  type: string;
  actor: 'you' | 'system' | 'operator' | 'responder';
  timestamp: number;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
};

export type SOSRecord = {
  id: string;
  status: SOSStatus;
  type: 'medical' | 'police' | 'watch';
  createdAt: number;
  location?: Coordinates;
  silent: boolean;
  incidentId: string;
};
