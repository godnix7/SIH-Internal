import type { Coordinates, Zone } from '@/src/lib/types';

import { LocationEngine } from '../locationEngine';
import { outboxQueue } from '../outboxQueue';

// Hoisted above the imports by babel-jest, so the engine sees the mocked queue.
jest.mock('../outboxQueue', () => ({ outboxQueue: { enqueue: jest.fn() } }));

const mockEnqueue = outboxQueue.enqueue as unknown as jest.Mock;

const restricted: Zone = {
  id: 'sikkim-restricted',
  class: 'restricted',
  name: 'Sikkim border buffer',
  version: 1,
  bufferM: 200,
  message: 'restricted',
  polygon: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

function fix(longitude: number, latitude: number, accuracy: number): Coordinates {
  return { longitude, latitude, accuracy, timestamp: Date.now() };
}

async function confirmations(engine: LocationEngine, trace: Coordinates[]): Promise<number> {
  let confirmed = 0;
  for (const point of trace) {
    const [evaluation] = await engine.ingestFix(point, [restricted], true);
    if (evaluation.confirmed && evaluation.state === 'inside') confirmed += 1;
  }
  return confirmed;
}

describe('LocationEngine geofence confirmation', () => {
  beforeEach(() => mockEnqueue.mockClear());

  it('does not confirm an entry from a single inside fix', async () => {
    const engine = new LocationEngine();
    engine.setTier('zones');
    expect(await confirmations(engine, [fix(0.5, 0.5, 10)])).toBe(0);
  });

  it('confirms only after two consecutive reliable inside fixes', async () => {
    const engine = new LocationEngine();
    engine.setTier('zones');
    expect(await confirmations(engine, [fix(0.5, 0.5, 10), fix(0.5, 0.5, 10)])).toBe(1);
  });

  it('emits no restricted entry for a trace oscillating across the boundary', async () => {
    const engine = new LocationEngine();
    engine.setTier('zones');
    // Alternating in/out fixes: the streak resets on every exit, so nothing confirms.
    const trace = Array.from({ length: 12 }, (_, index) =>
      index % 2 === 0 ? fix(0.5, 0.5, 10) : fix(1.5, 1.5, 10),
    );
    expect(await confirmations(engine, trace)).toBe(0);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('never confirms an entry while fix accuracy exceeds the restricted gate', async () => {
    const engine = new LocationEngine();
    engine.setTier('zones');
    const trace = Array.from({ length: 6 }, () => fix(0.5, 0.5, 45));
    expect(await confirmations(engine, trace)).toBe(0);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('keeps a confirmed restricted entry local when the tier forbids upload', async () => {
    const engine = new LocationEngine();
    engine.setTier('checkins');
    expect(await confirmations(engine, [fix(0.5, 0.5, 10), fix(0.5, 0.5, 10)])).toBe(1);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('uploads a confirmed restricted entry on the zones tier', async () => {
    const engine = new LocationEngine();
    engine.setTier('zones');
    await confirmations(engine, [fix(0.5, 0.5, 10), fix(0.5, 0.5, 10)]);
    expect(mockEnqueue).toHaveBeenCalledWith(
      'geofence.entered',
      expect.objectContaining({ zoneId: 'sikkim-restricted' }),
      'GEOFENCE_CRITICAL',
    );
  });

  it('stores no location batch on a tier that does not persist a trail', async () => {
    const engine = new LocationEngine();
    engine.setTier('checkins');
    await engine.ingestFix(fix(5, 5, 10), [restricted], true);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
