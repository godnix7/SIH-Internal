import type { Coordinates, Zone } from './types';

type Point = [number, number];

export function pointOnSegment(point: Point, start: Point, end: Point, epsilon = 1e-10): boolean {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (lengthSquared <= epsilon) return (x - x1) ** 2 + (y - y1) ** 2 <= epsilon;
  const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
  if (Math.abs(cross) > epsilon) return false;
  const dot = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1);
  if (dot < -epsilon) return false;
  return dot <= lengthSquared + epsilon;
}

export function pointInRing(point: Point, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (pointOnSegment(point, ring[j], ring[i])) return true;
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point: Point, polygon: Point[][]): boolean {
  if (polygon.length === 0 || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

export function isWithinBoundingBox(point: Point, polygon: Point[][]): boolean {
  const ring = polygon.flat();
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  return (
    point[0] >= Math.min(...xs) &&
    point[0] <= Math.max(...xs) &&
    point[1] >= Math.min(...ys) &&
    point[1] <= Math.max(...ys)
  );
}

export function zoneAccuracyThreshold(zone: Zone): number {
  return zone.class === 'advisory' ? 75 : 30;
}

export function isZoneFixReliable(zone: Zone, fix: Coordinates): boolean {
  return fix.accuracy > 0 && fix.accuracy < zoneAccuracyThreshold(zone);
}

export function evaluateZoneCandidate(
  zone: Zone,
  fix: Coordinates,
): 'inside' | 'outside' | 'uncertain' {
  const point: Point = [fix.longitude, fix.latitude];
  if (!isWithinBoundingBox(point, zone.polygon)) return 'outside';
  if (!isZoneFixReliable(zone, fix)) return 'uncertain';
  return pointInPolygon(point, zone.polygon) ? 'inside' : 'outside';
}
