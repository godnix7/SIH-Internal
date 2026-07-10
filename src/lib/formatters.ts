import type { ConsentTier } from './types';

export function formatCountdown(target: number, now = Date.now()): string {
  const total = Math.max(0, Math.ceil((target - now) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  if (hours === 0) return `${minutes}:${paddedSeconds}`;
  return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(timestamp);
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

const tierLabels: Record<ConsentTier, string> = {
  off: 'Off',
  checkins: 'Check-ins only',
  zones: 'Zone alerts',
  full: 'Full monitoring',
};

export function tierLabel(tier: ConsentTier): string {
  return tierLabels[tier];
}
