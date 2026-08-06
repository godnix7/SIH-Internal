import { io, type Socket } from 'socket.io-client';

export type RemoteIncident = {
  id: string;
  status:
    | 'created'
    | 'received'
    | 'acknowledged'
    | 'assigned'
    | 'responder_enroute'
    | 'responder_arrived'
    | 'resolve_pending'
    | 'resolved'
    | 'false_alarm'
    | 'cancelled'
    | 'cancelled_by_user';
  updatedAt?: number;
  otp?: string;
};

const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'https://yatri-shield-api.onrender.com';

export function connectRealtime(
  onIncident: (incident: RemoteIncident) => void,
  onNotification?: (notif: any) => void,
): Socket;
export function connectRealtime(
  token: string | null | undefined,
  onIncident: (incident: RemoteIncident) => void,
  onNotification?: (notif: any) => void,
): Socket;
export function connectRealtime(
  tokenOrHandler: string | null | undefined | ((incident: RemoteIncident) => void),
  onIncidentOrNotif?: ((incident: RemoteIncident) => void) | ((notif: any) => void),
  onNotification?: (notif: any) => void,
): Socket {
  const token = typeof tokenOrHandler === 'string' ? tokenOrHandler : '';
  const onIncident = (
    typeof tokenOrHandler === 'function' ? tokenOrHandler : onIncidentOrNotif
  ) as (incident: RemoteIncident) => void;
  const onNotif = (typeof tokenOrHandler === 'function' ? onIncidentOrNotif : onNotification) as
    ((notif: any) => void) | undefined;

  const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    timeout: 5_000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    auth: { token },
  });
  socket.on('incident:update', onIncident);
  socket.on('sos:update', onIncident);
  if (onNotif) {
    socket.on('notification:alert', onNotif);
  }
  return socket;
}
