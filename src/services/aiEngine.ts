import { Accelerometer } from 'expo-sensors';
import { AppState, AppStateStatus } from 'react-native';
import { wearableService } from './wearableService';

export type RiskVector = {
  anomalyType: string;
  riskScore: number;
  confidenceScore: number;
  corroboration: {
    screenActive: boolean;
    travelMode: string;
    peakG: number;
    heartRateBpm?: number;
    vitalSpike?: boolean;
  };
  timestamp: string;
};

export type EscalationLevel = 1 | 2 | 3 | 4;

type EscalationCallback = (level: EscalationLevel, vector: RiskVector) => void;

class EdgeAIEngine {
  private subscription: any = null;
  private buffer: { x: number; y: number; z: number; t: number }[] = [];
  private readonly WINDOW_SIZE_MS = 2500; // 2.5 seconds
  private readonly SAMPLE_RATE_MS = 20; // 50 Hz
  private appState: AppStateStatus = 'active';

  private escalationCallback?: EscalationCallback;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.appState = nextAppState;
  };

  public setEscalationCallback(cb: EscalationCallback) {
    this.escalationCallback = cb;
  }

  public startMonitoring() {
    if (this.subscription) return;

    Accelerometer.setUpdateInterval(this.SAMPLE_RATE_MS);
    this.subscription = Accelerometer.addListener((data) => {
      this.processSample({
        x: data.x,
        y: data.y,
        z: data.z,
        t: Date.now(),
      });
    });
    console.log('[AI ENGINE] Edge DSP Monitoring Started.');
  }

  public stopMonitoring() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    console.log('[AI ENGINE] Edge DSP Monitoring Stopped.');
  }

  private processSample(sample: { x: number; y: number; z: number; t: number }) {
    this.buffer.push(sample);

    // Prune old samples efficiently (avoid O(N) shift in a tight loop)
    const cutoff = sample.t - this.WINDOW_SIZE_MS;
    const firstValidIdx = this.buffer.findIndex((s) => s.t >= cutoff);
    if (firstValidIdx > 0) {
      this.buffer.splice(0, firstValidIdx);
    }

    // Once we have a full window (roughly 125 samples at 50Hz)
    if (this.buffer.length > 100) {
      this.evaluateWindow();
      // Clear buffer to avoid overlapping triggers in the immediate next frame
      this.buffer = [];
    }
  }

  private evaluateWindow() {
    let sumMagnitude = 0;
    let peakG = 0;
    let minG = 10.0;
    let consecutiveFreefallSamples = 0;
    let maxFreefallDurationSamples = 0;

    const magnitudes: number[] = [];

    for (const s of this.buffer) {
      // Euclidean norm (magnitude in G units)
      const mag = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
      magnitudes.push(mag);
      sumMagnitude += mag;
      if (mag > peakG) peakG = mag;
      if (mag < minG) minG = mag;

      // Check for near weightlessness / freefall (< 0.35 G)
      if (mag < 0.35) {
        consecutiveFreefallSamples++;
        if (consecutiveFreefallSamples > maxFreefallDurationSamples) {
          maxFreefallDurationSamples = consecutiveFreefallSamples;
        }
      } else {
        consecutiveFreefallSamples = 0;
      }
    }

    const sma = sumMagnitude / this.buffer.length;

    // A true vehicle rollover, fall from cliff, or physical assault drop exhibits
    // >= 120ms of freefall (at 50Hz, >6 samples) followed by an impact (> 3.2G).
    const hasFreefall = maxFreefallDurationSamples >= 6;

    // Check post-impact stationary state (last 20% of window having very low variance)
    const postImpactSlice = magnitudes.slice(Math.floor(magnitudes.length * 0.8));
    const sliceAvg = postImpactSlice.reduce((a, b) => a + b, 0) / (postImpactSlice.length || 1);
    const variance =
      postImpactSlice.reduce((acc, val) => acc + Math.pow(val - sliceAvg, 2), 0) /
      (postImpactSlice.length || 1);
    const isStationaryPostImpact = variance < 0.04;

    if (hasFreefall && peakG > 3.2) {
      console.log(
        `[AI ENGINE] Critical Anomaly: Freefall + Impact detected! Duration: ${maxFreefallDurationSamples * this.SAMPLE_RATE_MS}ms, Peak G: ${peakG.toFixed(2)}`,
      );
      this.triggerImpactAnomaly(
        peakG,
        sma,
        'FREEFALL_ROLLOVER_IMPACT',
        isStationaryPostImpact,
        true,
      );
    } else if (peakG > 4.8) {
      this.triggerImpactAnomaly(peakG, sma, 'HIGH_G_IMPACT', isStationaryPostImpact, false);
    }
  }

  private triggerImpactAnomaly(
    peakG: number,
    sma: number,
    type: string = 'HIGH_G_IMPACT',
    isStationaryPostImpact: boolean = false,
    fromFreefall: boolean = false,
  ) {
    console.log(
      `[AI ENGINE] Anomaly Processing: ${type} | Peak G: ${peakG.toFixed(2)}, SMA: ${sma.toFixed(2)}, Stationary: ${isStationaryPostImpact}`,
    );

    let baseRisk = fromFreefall ? 75 : 55;
    let confidenceMultiplier = 1.0;

    // Context Analysis
    const isScreenActive = this.appState === 'active';

    if (isScreenActive && !fromFreefall) {
      // Screen active without free-fall -> likely dropped phone or manual disturbance
      confidenceMultiplier = 0.2;
    } else {
      // Background context or verified free-fall rollover -> highly indicative of an emergency
      confidenceMultiplier = fromFreefall ? 1.8 : 1.4;
    }

    // Post-impact immobility suggests potential unconsciousness or entrapment
    if (isStationaryPostImpact && !isScreenActive) {
      confidenceMultiplier *= 1.3;
      baseRisk += 10;
    }

    // Hardware Corroboration: Query BLE Wearable for Heart Rate context
    const vitals = wearableService.getVitalContext();
    if (vitals.isSpiking) {
      console.log(
        `[AI ENGINE] Biological Distress Detected! Heart Rate spiked to ${vitals.currentBpm} BPM.`,
      );
      confidenceMultiplier *= 1.8;
      baseRisk = Math.min(95, baseRisk + 15);
    } else if (vitals.currentBpm !== null && !fromFreefall) {
      console.log(
        `[AI ENGINE] Vitals stable (${vitals.currentBpm} BPM). Reducing confidence of impact.`,
      );
      confidenceMultiplier *= 0.6;
    }

    if (peakG > 7.5) {
      baseRisk = Math.min(95, baseRisk + 15);
    }

    const finalConfidence = Math.min(100, 50 * confidenceMultiplier);

    const vector: RiskVector = {
      anomalyType: type,
      riskScore: Math.round(baseRisk),
      confidenceScore: Math.round(finalConfidence),
      corroboration: {
        screenActive: isScreenActive,
        travelMode: isStationaryPostImpact ? 'STATIONARY_AFTER_IMPACT' : 'ACTIVE_MOTION',
        peakG,
        ...(vitals.currentBpm
          ? { heartRateBpm: vitals.currentBpm, vitalSpike: vitals.isSpiking }
          : {}),
      },
      timestamp: new Date().toISOString(),
    };

    this.escalate(vector);
  }

  private escalate(vector: RiskVector) {
    if (!this.escalationCallback) return;

    let level: EscalationLevel = 1;

    if (vector.riskScore > 70 && vector.confidenceScore > 75) {
      level = 3; // Needs silent haptic verification
    } else if (vector.riskScore > 45 && vector.confidenceScore > 50) {
      level = 2; // Medium risk
    } else if (vector.riskScore > 20) {
      level = 1;
    }

    console.log(
      `[ESCALATION] Escalating anomaly (${vector.anomalyType}) to Level ${level}. Risk: ${vector.riskScore}, Confidence: ${vector.confidenceScore}`,
    );
    this.escalationCallback(level, vector);
  }

  // Expose a method to simulate an event for testing and demonstrations
  public simulateCrash(freefall: boolean = true) {
    console.log(
      `[AI ENGINE] Simulating a critical 8.5G crash (Freefall: ${freefall}) while device in background...`,
    );
    this.appState = 'background';
    this.triggerImpactAnomaly(
      8.5,
      3.8,
      freefall ? 'FREEFALL_ROLLOVER_IMPACT' : 'HIGH_G_IMPACT',
      true,
      freefall,
    );
  }
}

export const aiEngine = new EdgeAIEngine();
