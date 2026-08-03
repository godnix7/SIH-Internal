import { aiEngine, RiskVector, EscalationLevel } from './aiEngine';
import { api } from './api';
import { Vibration } from 'react-native';
import { outboxQueue } from './outboxQueue';
import { meshService } from './mesh';
import { locationEngine } from './locationEngine';

class EscalationManager {
  private level3Timeout: NodeJS.Timeout | null = null;
  private stage2Timeout: NodeJS.Timeout | null = null;
  private stage3Timeout: NodeJS.Timeout | null = null;

  public initialize() {
    aiEngine.setEscalationCallback((level, vector) => this.handleEscalation(level, vector));
    aiEngine.startMonitoring();
  }

  private handleEscalation(level: EscalationLevel, vector: RiskVector) {
    if (level === 1) {
      console.log('[ESCALATION] Level 1: Passive risk anomaly logged locally.');
    } else if (level === 2) {
      console.log('[ESCALATION] Level 2: Medium Risk detected. Elevating GPS polling frequency.');
      // Elevate telemetry accuracy in the location engine for proactive monitoring
      void locationEngine.setTripActive(true, 'elevated_risk_detected');
    } else if (level === 3) {
      this.triggerLevel3Verification(vector);
    }
  }

  private triggerLevel3Verification(vector: RiskVector) {
    console.log('[ESCALATION] Level 3 Triggered: PROGRESSIVE HAPTIC VERIFICATION');

    // Stage 1: Short gentle alert vibration
    Vibration.vibrate([200, 300, 200, 300], false);

    // Stage 2 at 5 seconds: Stronger double burst
    this.stage2Timeout = setTimeout(() => {
      console.log('[ESCALATION] Level 3 (5s elapsed): Elevating to strong double burst haptics.');
      Vibration.vibrate([400, 400, 400, 400, 400, 400], false);
    }, 5000);

    // Stage 3 at 10 seconds: Continuous urgent pulse
    this.stage3Timeout = setTimeout(() => {
      console.log('[ESCALATION] Level 3 (10s elapsed): Elevating to continuous urgent pulse.');
      Vibration.vibrate([150, 150], true); // true for looping vibration
    }, 10000);

    // Dynamic import to break dependency cycle
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAppStore } = require('../stores/useAppStore');
    const store = useAppStore.getState();

    // Prompt UI for safety confirmation with a 15-second countdown
    store.showVerificationPrompt(15, vector);

    this.level3Timeout = setTimeout(() => {
      // Automatic escalation if user doesn't verify within 15s
      this.escalateToLevel4(vector);
    }, 15000);
  }

  private clearAllTimeouts() {
    if (this.level3Timeout) {
      clearTimeout(this.level3Timeout);
      this.level3Timeout = null;
    }
    if (this.stage2Timeout) {
      clearTimeout(this.stage2Timeout);
      this.stage2Timeout = null;
    }
    if (this.stage3Timeout) {
      clearTimeout(this.stage3Timeout);
      this.stage3Timeout = null;
    }
    Vibration.cancel();
  }

  public cancelVerification() {
    this.clearAllTimeouts();
    console.log('[ESCALATION] User verified safety via PIN/UI. Escalation aborted.');
  }

  public escalateToLevel4(vector: RiskVector) {
    this.clearAllTimeouts();
    console.log('[ESCALATION] Level 4: CRITICAL CONFIDENCE. Dispatching Auto-SOS!');

    // Trigger immediate emergency tracking state
    void locationEngine.setEmergency(true);
    this.transmitRiskVector(vector);
  }

  private async transmitRiskVector(vector: RiskVector) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAppStore, activeTrip } = require('../stores/useAppStore');
    const store = useAppStore.getState();
    const trip = activeTrip(store.trips);

    const fix = locationEngine.getState().lastFix ||
      store.sos?.location || { latitude: 0, longitude: 0, accuracy: 0 };

    if (!trip) {
      console.warn(
        '[ESCALATION] No active trip found. Traversing emergency broadcast channels directly.',
      );
    }

    const payload = {
      ...vector,
      tripId: trip ? trip.id : 'EMERGENCY_DIRECT',
      location: fix,
    };

    try {
      await api.post('/risk/vector', payload);
      console.log('[ESCALATION] Successfully transmitted Risk Vector to Backend.');
    } catch (e) {
      console.error(
        '[ESCALATION] Network unavailable. Pushing to Outbox and initiating Mesh SOS Broadcast.',
      );
      await outboxQueue.enqueue('risk_vector', payload, 'SOS');
      await meshService.startBroadcastingSOS(
        trip ? trip.id : 'EMERGENCY_DIRECT',
        fix.latitude,
        fix.longitude,
      );
    }
  }
}

export const escalationManager = new EscalationManager();
