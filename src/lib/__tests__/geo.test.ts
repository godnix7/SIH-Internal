import { evaluateZoneCandidate, pointInPolygon, pointOnSegment } from '../geo';
import type { Zone } from '../types';

const zone: Zone = {
  id: 'test-zone',
  class: 'restricted',
  name: 'Test zone',
  version: 1,
  bufferM: 10,
  message: 'Test',
  polygon: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
    [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ],
  ],
};

describe('geofence geometry', () => {
  it('treats a polygon edge as inside', () => {
    expect(pointOnSegment([0, 5], [0, 0], [0, 10])).toBe(true);
    expect(pointInPolygon([0, 5], zone.polygon)).toBe(true);
  });

  it('excludes points inside a polygon hole', () => {
    expect(pointInPolygon([5, 5], zone.polygon)).toBe(false);
    expect(pointInPolygon([2, 2], zone.polygon)).toBe(true);
  });

  it('rejects low-confidence restricted fixes instead of emitting a false entry', () => {
    expect(
      evaluateZoneCandidate(zone, {
        latitude: 2,
        longitude: 2,
        accuracy: 31,
        timestamp: Date.now(),
      }),
    ).toBe('uncertain');
  });

  it('accepts a reliable inside fix and rejects a reliable outside fix', () => {
    expect(
      evaluateZoneCandidate(zone, {
        latitude: 2,
        longitude: 2,
        accuracy: 12,
        timestamp: Date.now(),
      }),
    ).toBe('inside');
    expect(
      evaluateZoneCandidate(zone, {
        latitude: 12,
        longitude: 12,
        accuracy: 12,
        timestamp: Date.now(),
      }),
    ).toBe('outside');
  });
});
