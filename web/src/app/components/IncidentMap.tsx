'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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

const createIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const icons = {
  active: createIcon('red'),
  resolved: createIcon('green'),
  pending: createIcon('gold'),
  cancelled: createIcon('black'),
};

function MapController({
  selectedIncident,
  incidents,
}: {
  selectedIncident: any | null;
  incidents: any[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedIncident && selectedIncident.latLng) {
      map.flyTo(selectedIncident.latLng, 16, { animate: true, duration: 1.2 });
    }
  }, [selectedIncident, map]);

  return null;
}

export interface IncidentMapProps {
  incidents: any[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: any) => void;
}

export default function IncidentMap({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}: IncidentMapProps) {
  const [isClient, setIsClient] = useState(false);
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getLatLng = (wkt: string | null): [number, number] | null => {
    if (!wkt) return null;
    const match = wkt.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (match) {
      return [parseFloat(match[2]), parseFloat(match[1])];
    }
    return null;
  };

  const incidentsWithLocation = incidents
    .map((inc) => ({
      ...inc,
      latLng:
        inc.latLng ||
        (inc.locationWkt
          ? getLatLng(inc.locationWkt)
          : inc.location
            ? getLatLng(inc.location)
            : null),
    }))
    .filter((inc) => inc.latLng);

  const selectedIncident =
    incidentsWithLocation.find((inc) => inc.id === selectedIncidentId) || null;

  useEffect(() => {
    if (selectedIncidentId && markerRefs.current[selectedIncidentId]) {
      markerRefs.current[selectedIncidentId]?.openPopup();
    }
  }, [selectedIncidentId, isClient]);

  if (!isClient) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-surface-variant)',
          borderRadius: '12px',
          color: 'var(--color-on-surface-variant)',
        }}
      >
        Loading Synchronized Map...
      </div>
    );
  }

  const defaultCenter: [number, number] = [28.6139, 77.209];
  let center = defaultCenter;

  if (selectedIncident && selectedIncident.latLng) {
    center = selectedIncident.latLng as [number, number];
  } else if (incidentsWithLocation.length > 0) {
    center = incidentsWithLocation[0].latLng as [number, number];
  }

  const getIconForStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    if (['resolved', 'closed'].includes(s)) return icons.resolved;
    if (['resolve_pending', 'pending'].includes(s)) return icons.pending;
    if (['cancelled', 'cancelled_by_user', 'false_alarm'].includes(s)) return icons.cancelled;
    return icons.active;
  };

  const getStatusBadgeColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (['resolved', 'closed'].includes(s)) return '#2e7d32'; // green
    if (['resolve_pending', 'pending'].includes(s)) return '#f57f17'; // gold/amber
    if (['cancelled', 'cancelled_by_user', 'false_alarm'].includes(s)) return '#424242'; // grey
    return '#c62828'; // red
  };

  const formatStatus = (status: string) => {
    if (!status) return 'Unknown';
    if (status.toLowerCase() === 'cancelled_by_user') return '⚫ Cancelled by User';
    if (status.toLowerCase() === 'resolve_pending') return '🟡 Resolve Pending (OTP)';
    if (status.toLowerCase() === 'resolved') return '🟢 Resolved';
    return `🔴 Active (${status.toUpperCase()})`;
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        position: 'relative',
      }}
    >
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController selectedIncident={selectedIncident} incidents={incidentsWithLocation} />

        {incidentsWithLocation.map(
          (inc) =>
            inc.latLng && (
              <Marker
                key={inc.id}
                position={inc.latLng}
                icon={getIconForStatus(inc.status)}
                ref={(ref) => {
                  markerRefs.current[inc.id] = ref;
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectIncident) onSelectIncident(inc);
                  },
                }}
              >
                <Popup>
                  <div
                    style={{
                      minWidth: '220px',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    <div
                      style={{
                        paddingBottom: '6px',
                        borderBottom: '1px solid #eee',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>
                        {inc.touristDetails?.name || `Tourist #${inc.id.slice(0, 6)}`}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: getStatusBadgeColor(inc.status),
                          color: '#fff',
                          fontWeight: '600',
                        }}
                      >
                        {formatStatus(inc.status)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#444',
                        lineHeight: '1.5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div>
                        <b>Type:</b> {inc.type ? inc.type.toUpperCase() : 'GENERAL EMERGENCY'}
                      </div>
                      <div>
                        <b>Severity:</b>{' '}
                        <span
                          style={{
                            color: inc.severity === 'CRITICAL' ? '#c62828' : '#333',
                            fontWeight: '600',
                          }}
                        >
                          {inc.severity || 'HIGH'}
                        </span>
                      </div>
                      <div>
                        <b>Time:</b>{' '}
                        {inc.createdAt ? new Date(inc.createdAt).toLocaleString() : 'Just now'}
                      </div>
                      <div>
                        <b>Coordinates:</b> {inc.latLng[0].toFixed(5)}, {inc.latLng[1].toFixed(5)}
                      </div>
                      {inc.assignedTo && (
                        <div>
                          <b>Assigned Responder ID:</b> {inc.assignedTo}
                        </div>
                      )}
                      {inc.touristDetails?.bloodGroup && (
                        <div>
                          <b>Blood Group:</b> {inc.touristDetails.bloodGroup}
                        </div>
                      )}
                      {inc.touristDetails?.allergies && (
                        <div>
                          <b>Allergies:</b> {inc.touristDetails.allergies}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
                {inc.severity === 'CRITICAL' &&
                  !['resolved', 'closed', 'cancelled', 'cancelled_by_user', 'false_alarm'].includes(
                    (inc.status || '').toLowerCase(),
                  ) && (
                    <Circle
                      center={inc.latLng}
                      radius={120}
                      pathOptions={{ color: '#d32f2f', fillColor: '#d32f2f', fillOpacity: 0.25 }}
                    />
                  )}
              </Marker>
            ),
        )}
      </MapContainer>
    </div>
  );
}
