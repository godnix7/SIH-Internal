import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

export interface IncidentEventPayload {
  id: string;
  status: string;
  updatedAt: number;
}

export function useIncidentsSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastEvent, setLastEvent] = useState<IncidentEventPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the Socket.IO server
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const socketInstance = io(SOCKET_URL, {
      path: '/socket.io/',
      transports: ['websocket'],
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server:', socketInstance.id);
      setIsConnected(true);
    });

    // The backend broadcasts generic updates (or specific to org rooms)
    // We listen to the incident_update event based on our backend code
    socketInstance.on('incident:update', (data: IncidentEventPayload) => {
      console.log('Received incident update:', data);
      setLastEvent(data);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, lastEvent, isConnected };
}
