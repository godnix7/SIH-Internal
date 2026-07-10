import { remoteConfig } from '@/src/lib/constants';
import { evaluateZoneCandidate } from '@/src/lib/geo';
import type { ConsentTier, Coordinates, MonitoringMode, Zone } from '@/src/lib/types';
import { outboxQueue } from './outboxQueue';

export type LocationEngineState = {
  mode: MonitoringMode;
  offline: boolean;
  tier: ConsentTier;
  stationarySince?: number;
  lastFix?: Coordinates;
};

export type ZoneEvaluation = {
  zone: Zone;
  state: 'inside' | 'outside' | 'uncertain';
  confirmed: boolean;
};

type Listener = (state: LocationEngineState) => void;

export class LocationEngine {
  private state: LocationEngineState = { mode: 'IDLE', offline: false, tier: 'checkins' };
  private listeners = new Set<Listener>();
  private insideCounts = new Map<string, number>();
  private cooldowns = new Map<string, number>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): LocationEngineState {
    return this.state;
  }

  async transition(mode: MonitoringMode, reason: string): Promise<void> {
    if (mode === this.state.mode) return;
    this.state = { ...this.state, mode };
    this.emit();
    await outboxQueue.enqueue(
      'monitoring.mode_transition',
      { mode, reason, timestamp: Date.now() },
      'LOCATION_BATCH',
    );
  }

  setOffline(offline: boolean): void {
    this.state = { ...this.state, offline };
    this.emit();
  }

  setTier(tier: ConsentTier): void {
    this.state = { ...this.state, tier };
    this.emit();
  }

  samplingIntervalSeconds(): number {
    if (
      this.state.mode === 'ACTIVE_TRIP' &&
      this.state.stationarySince &&
      Date.now() - this.state.stationarySince >= 10 * 60_000
    )
      return 300;
    return remoteConfig.modes[this.state.mode].gpsSeconds;
  }

  async ingestFix(fix: Coordinates, zones: Zone[], moving: boolean): Promise<ZoneEvaluation[]> {
    this.state = {
      ...this.state,
      lastFix: fix,
      stationarySince: moving ? undefined : (this.state.stationarySince ?? Date.now()),
    };
    this.emit();
    if (this.state.tier === 'full') {
      await outboxQueue.enqueue('location.batch', { fixes: [fix] }, 'LOCATION_BATCH');
    }
    const evaluations = zones.map((zone) => this.evaluate(zone, fix));
    for (const evaluation of evaluations) {
      if (!evaluation.confirmed || evaluation.state !== 'inside') continue;
      const critical =
        evaluation.zone.class === 'restricted' || evaluation.zone.class === 'disaster';
      if (critical && remoteConfig.tiers[this.state.tier].restrictedEventsUploaded) {
        await outboxQueue.enqueue(
          'geofence.entered',
          { zoneId: evaluation.zone.id, version: evaluation.zone.version, fix },
          'GEOFENCE_CRITICAL',
        );
      }
    }
    return evaluations;
  }

  private evaluate(zone: Zone, fix: Coordinates): ZoneEvaluation {
    const result = evaluateZoneCandidate(zone, fix);
    if (result !== 'inside') {
      this.insideCounts.set(zone.id, 0);
      return { zone, state: result, confirmed: false };
    }
    const count = (this.insideCounts.get(zone.id) ?? 0) + 1;
    this.insideCounts.set(zone.id, count);
    const cooldownUntil = this.cooldowns.get(zone.id) ?? 0;
    const confirmed =
      count >= remoteConfig.geofence.consecutiveFixes && Date.now() >= cooldownUntil;
    if (confirmed) this.cooldowns.set(zone.id, Date.now() + remoteConfig.geofence.cooldownMs);
    return { zone, state: result, confirmed };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const locationEngine = new LocationEngine();
