"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function IncidentMap({ incidents }: { incidents: any[] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>;
  }

  // Find center - use the first incident location or a default center (e.g., Delhi, India)
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  let center = defaultCenter;

  const getLatLng = (wkt: string | null): [number, number] | null => {
    if (!wkt) return null;
    const match = wkt.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (match) {
      return [parseFloat(match[2]), parseFloat(match[1])];
    }
    return null;
  };

  const incidentsWithLocation = incidents.map(inc => ({
    ...inc,
    latLng: inc.location ? getLatLng(inc.location) : null
  })).filter(inc => inc.latLng);

  if (incidentsWithLocation.length > 0) {
    center = incidentsWithLocation[0].latLng as [number, number];
  }

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {incidentsWithLocation.map((inc) => (
          inc.latLng && (
            <Marker key={inc.id} position={inc.latLng} icon={redIcon}>
              <Popup>
                <div style={{ fontWeight: 'bold' }}>Incident: {inc.type}</div>
                <div>Status: {inc.status}</div>
                <div>Priority: {inc.severity}</div>
              </Popup>
              {/* Optional: Add a pulsing circle for critical incidents */}
              {inc.severity === 'CRITICAL' && (
                <Circle
                  center={inc.latLng}
                  radius={100}
                  pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
                />
              )}
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}
