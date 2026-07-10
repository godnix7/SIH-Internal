import type { Coordinates, Zone } from '@/src/lib/types';
import { locationEngine } from './locationEngine';

export type DemoScenario = 'jaipur' | 'sikkim' | 'sahastra' | 'sos';

const routes: Record<Exclude<DemoScenario, 'sos'>, Coordinates[]> = {
  jaipur: [
    { latitude: 26.925, longitude: 75.824, accuracy: 12, timestamp: 0 },
    { latitude: 26.9256, longitude: 75.825, accuracy: 12, timestamp: 0 },
    { latitude: 26.9261, longitude: 75.8255, accuracy: 12, timestamp: 0 },
  ],
  sikkim: [
    { latitude: 27.777, longitude: 88.713, accuracy: 65, timestamp: 0 },
    { latitude: 27.7774, longitude: 88.7136, accuracy: 18, timestamp: 0 },
    { latitude: 27.7776, longitude: 88.7138, accuracy: 15, timestamp: 0 },
    { latitude: 27.779, longitude: 88.716, accuracy: 15, timestamp: 0 },
  ],
  sahastra: [
    { latitude: 30.859, longitude: 78.555, accuracy: 18, timestamp: 0 },
    { latitude: 30.86, longitude: 78.558, accuracy: 18, timestamp: 0 },
    { latitude: 30.862, longitude: 78.563, accuracy: 20, timestamp: 0 },
    { latitude: 30.866, longitude: 78.57, accuracy: 25, timestamp: 0 },
  ],
};

export class DemoEngine {
  private cancel?: () => void;

  stop(): void {
    this.cancel?.();
    this.cancel = undefined;
  }

  run(scenario: DemoScenario, zones: Zone[], speed: 1 | 8, onEvent: (event: string) => void): void {
    this.stop();
    if (scenario === 'sos') {
      onEvent('sos');
      return;
    }
    const route = routes[scenario];
    let index = 0;
    let stopped = false;
    this.cancel = () => {
      stopped = true;
    };
    const next = async (): Promise<void> => {
      if (stopped || index >= route.length) return;
      const fix = { ...route[index], timestamp: Date.now() };
      const events = await locationEngine.ingestFix(fix, zones, true);
      events
        .filter((event) => event.confirmed || event.state === 'uncertain')
        .forEach((event) => onEvent(`${event.state}:${event.zone.id}`));
      if (scenario === 'sahastra' && index === 2) {
        locationEngine.setOffline(true);
        onEvent('offline');
      }
      index += 1;
      setTimeout(next, 8_000 / speed);
    };
    void next();
  }
}

export const demoEngine = new DemoEngine();
