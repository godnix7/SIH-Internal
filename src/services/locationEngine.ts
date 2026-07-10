import { remoteConfig } from '@/src/lib/constants';
import { evaluateZoneCandidate } from '@/src/lib/geo';
import type { ConsentTier, Coordinates, ModeAccuracy, MonitoringMode, Zone } from '@/src/lib/types';
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

/** What the OS location subscription should be doing in the current mode. */
export type SamplingPlan = {
  intervalSeconds: number;
  accuracy: ModeAccuracy;
};

type Listener = (state: LocationEngineState) => void;

function isCritical(zone: Zone): boolean {
  return zone.class === 'restricted' || zone.class === 'disaster';
}

export class LocationEngine {
  private state: LocationEngineState = { mode: 'IDLE', offline: false, tier: 'checkins' };
  private listeners = new Set<Listener>();
  private insideCounts = new Map<string, number>();
  private cooldowns = new Map<string, number>();
  private tripActive = false;
  private emergency = false;
  private highRisk = false;
  private lowBattery = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): LocationEngineState {
    return this.state;
  }

  /**
   * Precedence: an emergency outranks everything, so a low battery can never
   * throttle an active SOS. Being inside a critical zone outranks the battery
   * saver too -- the moment we most need fixes is the moment we are least
   * willing to skip them.
   */
  private computeMode(): MonitoringMode {
    if (this.emergency) return 'EMERGENCY';
    if (!this.tripActive) return 'IDLE';
    if (this.highRisk) return 'HIGH_RISK';
    if (this.lowBattery) return 'LOW_BATTERY';
    return 'ACTIVE_TRIP';
  }

  private async applyMode(reason: string): Promise<void> {
    const mode = this.computeMode();
    if (mode === this.state.mode) return;
    this.state = { ...this.state, mode };
    this.emit();
    // Mode transitions describe movement and battery, so they are telemetry.
    // Only the tier that stores a location trail may upload them; EMERGENCY is
    // exempt because an SOS is uploaded on every tier by design.
    const uploadable = remoteConfig.tiers[this.state.tier].locationsStored || mode === 'EMERGENCY';
    if (!uploadable) return;
    await outboxQueue.enqueue(
      'monitoring.mode_transition',
      { mode, reason, timestamp: Date.now() },
      'LOCATION_BATCH',
    );
  }

  async setTripActive(
    active: boolean,
    reason = active ? 'trip_started' : 'trip_ended',
  ): Promise<void> {
    if (this.tripActive === active) return;
    this.tripActive = active;
    if (!active) {
      this.highRisk = false;
      this.insideCounts.clear();
      this.state = { ...this.state, stationarySince: undefined };
    }
    await this.applyMode(reason);
  }

  async setEmergency(active: boolean): Promise<void> {
    if (this.emergency === active) return;
    this.emergency = active;
    await this.applyMode(active ? 'sos_started' : 'sos_ended');
  }

  /** Battery level 0..1. Uses hysteresis so a hovering level cannot flap the mode. */
  async setBatteryLevel(level: number, charging: boolean): Promise<void> {
    const low = !charging && level <= remoteConfig.battery.lowLevel;
    const recovered = charging || level >= remoteConfig.battery.recoveredLevel;
    const next = this.lowBattery ? !recovered : low;
    if (next === this.lowBattery) return;
    this.lowBattery = next;
    await this.applyMode(next ? 'battery_low' : 'battery_recovered');
  }

  setMoving(moving: boolean): void {
    const stationarySince = moving ? undefined : (this.state.stationarySince ?? Date.now());
    if (stationarySince === this.state.stationarySince) return;
    this.state = { ...this.state, stationarySince };
    this.emit();
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
    const { stationaryAfterMs, stationaryGpsSeconds } = remoteConfig.motion;
    if (
      this.state.mode === 'ACTIVE_TRIP' &&
      this.state.stationarySince &&
      Date.now() - this.state.stationarySince >= stationaryAfterMs
    )
      return stationaryGpsSeconds;
    return remoteConfig.modes[this.state.mode].gpsSeconds;
  }

  samplingPlan(): SamplingPlan {
    return {
      intervalSeconds: this.samplingIntervalSeconds(),
      accuracy: remoteConfig.modes[this.state.mode].accuracy,
    };
  }

  async ingestFix(fix: Coordinates, zones: Zone[], moving?: boolean): Promise<ZoneEvaluation[]> {
    if (moving !== undefined) this.setMoving(moving);
    this.state = { ...this.state, lastFix: fix };
    this.emit();
    if (this.state.tier === 'full') {
      await outboxQueue.enqueue('location.batch', { fixes: [fix] }, 'LOCATION_BATCH');
    }
    const evaluations = zones.map((zone) => this.evaluate(zone, fix));
    for (const evaluation of evaluations) {
      if (!evaluation.confirmed || evaluation.state !== 'inside') continue;
      if (
        isCritical(evaluation.zone) &&
        remoteConfig.tiers[this.state.tier].restrictedEventsUploaded
      ) {
        await outboxQueue.enqueue(
          'geofence.entered',
          { zoneId: evaluation.zone.id, version: evaluation.zone.version, fix },
          'GEOFENCE_CRITICAL',
        );
      }
    }
    await this.updateRisk(evaluations);
    return evaluations;
  }

  /** Inside any critical zone raises the sampling rate; leaving them all lowers it. */
  private async updateRisk(evaluations: ZoneEvaluation[]): Promise<void> {
    const insideCritical = evaluations.some(
      (evaluation) => isCritical(evaluation.zone) && evaluation.state === 'inside',
    );
    if (insideCritical === this.highRisk) return;
    this.highRisk = insideCritical;
    await this.applyMode(insideCritical ? 'entered_critical_zone' : 'left_critical_zone');
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
