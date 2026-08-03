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

const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://10.0.2.2:8000';

export function connectRealtime(
  token: string,
  onIncident: (incident: RemoteIncident) => void,
  onNotification?: (notif: any) => void,
): Socket {
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
  if (onNotification) {
    socket.on('notification:alert', onNotification);
  }
  return socket;
}
