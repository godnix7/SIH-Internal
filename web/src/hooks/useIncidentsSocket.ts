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

  useEffect(() => {
    // Connect to the Socket.IO server
    // Note: Since this is an MVP without full auth, we connect and don't immediately validate tokens
    const socketInstance = io(SOCKET_URL, {
      path: '/socket.io/',
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server:', socketInstance.id);
      
      // In a real app we'd emit an authenticate event here:
      // socketInstance.emit('authenticate', { token: 'Bearer mock_token' });
    });

    // The backend broadcasts generic updates (or specific to org rooms)
    // We listen to the incident_update event based on our backend code
    socketInstance.on('incident_update', (data: IncidentEventPayload) => {
      console.log('Received incident update:', data);
      setLastEvent(data);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, lastEvent };
}
