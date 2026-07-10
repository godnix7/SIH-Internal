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

describe('LocationEngine mode table', () => {
  beforeEach(() => mockEnqueue.mockClear());

  async function activeEngine(tier: 'full' | 'zones' | 'checkins' | 'off' = 'full') {
    const engine = new LocationEngine();
    engine.setTier(tier);
    await engine.setTripActive(true);
    return engine;
  }

  it('is IDLE until a trip starts and returns to IDLE when it ends', async () => {
    const engine = new LocationEngine();
    engine.setTier('full');
    expect(engine.getState().mode).toBe('IDLE');
    await engine.setTripActive(true);
    expect(engine.getState().mode).toBe('ACTIVE_TRIP');
    await engine.setTripActive(false);
    expect(engine.getState().mode).toBe('IDLE');
  });

  it('drives the documented interval and accuracy for each mode', async () => {
    const engine = await activeEngine();
    expect(engine.samplingPlan()).toEqual({ intervalSeconds: 60, accuracy: 'balanced' });

    await engine.setBatteryLevel(0.1, false);
    expect(engine.samplingPlan()).toEqual({ intervalSeconds: 240, accuracy: 'low' });

    await engine.setEmergency(true);
    expect(engine.samplingPlan()).toEqual({ intervalSeconds: 3, accuracy: 'highest' });
  });

  it('lets an emergency outrank a low battery', async () => {
    const engine = await activeEngine();
    await engine.setBatteryLevel(0.05, false);
    expect(engine.getState().mode).toBe('LOW_BATTERY');
    await engine.setEmergency(true);
    expect(engine.getState().mode).toBe('EMERGENCY');
    await engine.setEmergency(false);
    expect(engine.getState().mode).toBe('LOW_BATTERY');
  });

  it('applies battery hysteresis so a hovering level cannot flap the mode', async () => {
    const engine = await activeEngine();
    await engine.setBatteryLevel(0.14, false);
    expect(engine.getState().mode).toBe('LOW_BATTERY');
    await engine.setBatteryLevel(0.17, false); // above lowLevel, below recoveredLevel
    expect(engine.getState().mode).toBe('LOW_BATTERY');
    await engine.setBatteryLevel(0.25, false);
    expect(engine.getState().mode).toBe('ACTIVE_TRIP');
  });

  it('leaves LOW_BATTERY as soon as the phone is charging', async () => {
    const engine = await activeEngine();
    await engine.setBatteryLevel(0.05, false);
    expect(engine.getState().mode).toBe('LOW_BATTERY');
    await engine.setBatteryLevel(0.05, true);
    expect(engine.getState().mode).toBe('ACTIVE_TRIP');
  });

  it('enters HIGH_RISK inside a critical zone and leaves it on exit', async () => {
    const engine = await activeEngine('zones');
    await engine.ingestFix(fix(0.5, 0.5, 10), [restricted], true);
    await engine.ingestFix(fix(0.5, 0.5, 10), [restricted], true);
    expect(engine.getState().mode).toBe('HIGH_RISK');
    expect(engine.samplingPlan()).toEqual({ intervalSeconds: 20, accuracy: 'high' });

    await engine.ingestFix(fix(5, 5, 10), [restricted], true);
    expect(engine.getState().mode).toBe('ACTIVE_TRIP');
  });

  it('keeps a critical zone above the battery saver', async () => {
    const engine = await activeEngine('zones');
    await engine.setBatteryLevel(0.05, false);
    await engine.ingestFix(fix(0.5, 0.5, 10), [restricted], true);
    expect(engine.getState().mode).toBe('HIGH_RISK');
  });
});

describe('LocationEngine motion gating', () => {
  beforeEach(() => {
    mockEnqueue.mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-10T00:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('stretches GPS to 5 minutes after ten stationary minutes, and restores it on motion', async () => {
    const engine = new LocationEngine();
    engine.setTier('full');
    await engine.setTripActive(true);

    engine.setMoving(false);
    expect(engine.samplingIntervalSeconds()).toBe(60);

    jest.advanceTimersByTime(10 * 60_000);
    expect(engine.samplingIntervalSeconds()).toBe(300);

    engine.setMoving(true);
    expect(engine.samplingIntervalSeconds()).toBe(60);
  });

  it('does not stretch GPS while stationary in EMERGENCY', async () => {
    const engine = new LocationEngine();
    engine.setTier('full');
    await engine.setTripActive(true);
    engine.setMoving(false);
    jest.advanceTimersByTime(10 * 60_000);
    await engine.setEmergency(true);
    expect(engine.samplingIntervalSeconds()).toBe(3);
  });
});

describe('LocationEngine mode-transition privacy', () => {
  beforeEach(() => mockEnqueue.mockClear());

  const transitions = () =>
    mockEnqueue.mock.calls.filter(([type]) => type === 'monitoring.mode_transition');

  it('uploads mode transitions only on the tier that stores a location trail', async () => {
    const full = new LocationEngine();
    full.setTier('full');
    await full.setTripActive(true);
    expect(transitions()).toHaveLength(1);

    mockEnqueue.mockClear();
    for (const tier of ['off', 'checkins', 'zones'] as const) {
      const engine = new LocationEngine();
      engine.setTier(tier);
      await engine.setTripActive(true);
    }
    expect(transitions()).toHaveLength(0);
  });

  it('uploads the EMERGENCY transition even when the tier is Off', async () => {
    const engine = new LocationEngine();
    engine.setTier('off');
    await engine.setEmergency(true);
    expect(transitions()).toHaveLength(1);
    expect(transitions()[0][1]).toMatchObject({ mode: 'EMERGENCY' });
  });
});
