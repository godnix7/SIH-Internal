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
    | 'cancelled';
  updatedAt?: number;
  otp?: string;
};

const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://10.0.2.2:8000';

export function connectRealtime(
  token: string,
  onIncident: (incident: RemoteIncident) => void,
): Socket {
  const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    timeout: 5_000,
    reconnection: true,
    auth: { token },
  });
  socket.on('incident:update', onIncident);
  return socket;
}
