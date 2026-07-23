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
    this.subscription = Accelerometer.addListener(data => {
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
    const firstValidIdx = this.buffer.findIndex(s => s.t >= cutoff);
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
    // Calculate Signal Magnitude Area (SMA) and Peak G
    let sumMagnitude = 0;
    let peakG = 0;

    for (const s of this.buffer) {
      // Euclidean norm (magnitude)
      const mag = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
      sumMagnitude += mag;
      if (mag > peakG) peakG = mag;
    }

    const sma = sumMagnitude / this.buffer.length;

    // Normal gravity is ~1G. 
    // Freefall is near 0G. 
    // Impact is > 4G.
    
    // 1. Detect Impact
    if (peakG > 5.0) {
      this.triggerImpactAnomaly(peakG, sma);
    } 
    // 2. Detect Freefall (not implemented fully for brevity, but mathematically it's when mag approaches 0 for > 500ms)
    // else if (...) { }
  }

  private triggerImpactAnomaly(peakG: number, sma: number) {
    // We detected a significant G-force spike.
    console.log(`[AI ENGINE] Impact Detected! Peak G: ${peakG.toFixed(2)}, SMA: ${sma.toFixed(2)}`);
    
    let baseRisk = 60;
    let confidenceMultiplier = 1.0;
    
    // Corroboration Context
    const isScreenActive = this.appState === 'active';
    
    if (isScreenActive) {
      // If the screen is active, it's highly likely a dropped phone or an angry user throwing it on the couch.
      // Dropping confidence drastically.
      confidenceMultiplier = 0.1;
    } else {
      // If screen is off/background, it's more likely a true accident.
      confidenceMultiplier = 1.5;
    }
    
    // Hardware Corroboration: Query BLE Wearable for Heart Rate context
    const vitals = wearableService.getVitalContext();
    if (vitals.isSpiking) {
      console.log(`[AI ENGINE] Biological Distress Detected! Heart Rate spiked to ${vitals.currentBpm} BPM.`);
      confidenceMultiplier *= 1.8; // Massive confidence boost for tachycardia during impact
    } else if (vitals.currentBpm !== null) {
      console.log(`[AI ENGINE] Vitals stable (${vitals.currentBpm} BPM). Reducing confidence of impact.`);
      confidenceMultiplier *= 0.5; // Stable heart rate implies device impact, not human distress
    }
    
    if (peakG > 8.0) {
      baseRisk = 80;
    }
    
    const finalConfidence = Math.min(100, 50 * confidenceMultiplier); // Base confidence of 50
    
    const vector: RiskVector = {
      anomalyType: 'HIGH_G_IMPACT',
      riskScore: baseRisk,
      confidenceScore: Math.round(finalConfidence),
      corroboration: {
        screenActive: isScreenActive,
        travelMode: 'UNKNOWN', // Would be fetched from Location Engine
        peakG,
        ...(vitals.currentBpm ? { heartRateBpm: vitals.currentBpm, vitalSpike: vitals.isSpiking } : {})
      },
      timestamp: new Date().toISOString()
    };
    
    this.escalate(vector);
  }

  private escalate(vector: RiskVector) {
    if (!this.escalationCallback) return;
    
    let level: EscalationLevel = 1;
    
    if (vector.riskScore > 70 && vector.confidenceScore > 75) {
      level = 3; // Needs silent haptic verification
    } else if (vector.riskScore > 40 && vector.confidenceScore > 50) {
      level = 2; // Medium risk
    } else if (vector.riskScore > 20) {
      level = 1;
    }
    
    console.log(`[ESCALATION] Escalating anomaly to Level ${level}. Confidence: ${vector.confidenceScore}`);
    this.escalationCallback(level, vector);
  }
  
  // Expose a method to simulate an event for testing, as requested in the plan
  public simulateCrash() {
    console.log('[AI ENGINE] Simulating a 9G crash while screen is off...');
    this.appState = 'background'; // Force background context
    this.triggerImpactAnomaly(9.5, 3.2);
  }
}

export const aiEngine = new EdgeAIEngine();
