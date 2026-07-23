import { io, type Socket } from 'socket.io-client';

export type RemoteIncident = {
  id: string;
  status: 'received' | 'acknowledged' | 'responder_enroute' | 'resolved';
  updatedAt?: number;
};

const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://10.0.2.2:8000';

export function connectRealtime(onIncident: (incident: RemoteIncident) => void): Socket {
  const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    timeout: 5_000,
    reconnection: true,
  });
  socket.on('incident:update', onIncident);
  return socket;
}
