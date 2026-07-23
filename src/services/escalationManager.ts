import { aiEngine, RiskVector, EscalationLevel } from './aiEngine';
import { api } from './api';
import { Vibration } from 'react-native';
import { outboxQueue } from './outboxQueue';
import { meshService } from './mesh';

class EscalationManager {
  private level3Timeout: NodeJS.Timeout | null = null;

  public initialize() {
    aiEngine.setEscalationCallback((level, vector) => this.handleEscalation(level, vector));
    aiEngine.startMonitoring();
  }

  private handleEscalation(level: EscalationLevel, vector: RiskVector) {
    if (level === 1) {
      // Passive logging
      console.log('[ESCALATION] Level 1: Passive risk logged locally.');
    } 
    else if (level === 2) {
      // Elevate GPS polling, prep mesh
      console.log('[ESCALATION] Level 2: Medium Risk. Increasing GPS polling.');
      // Normally we would talk to LocationEngine here
    }
    else if (level === 3) {
      // High Risk, needs verification
      this.triggerLevel3Verification(vector);
    }
  }

  private triggerLevel3Verification(vector: RiskVector) {
    console.log('[ESCALATION] Level 3 Triggered: SILENT HAPTIC VERIFICATION');
    // Vibrate intensely to alert the user
    Vibration.vibrate([500, 1000, 500, 1000, 500, 1000], false);
    
    // In the UI, a modal would pop up listening to a global state.
    // For now, we will simulate the 15-second countdown.
    // Dynamic import to break dependency cycle if needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAppStore } = require('../stores/useAppStore');
    const store = useAppStore.getState();
    
    // Tell the UI to show the "Are you safe?" prompt
    store.showVerificationPrompt(15, vector);
    
    this.level3Timeout = setTimeout(() => {
      // If user hasn't cancelled it within 15s
      this.escalateToLevel4(vector);
    }, 15000);
  }

  public cancelVerification() {
    if (this.level3Timeout) {
      clearTimeout(this.level3Timeout);
      this.level3Timeout = null;
    }
    Vibration.cancel();
    console.log('[ESCALATION] User marked as SAFE. Escelation aborted.');
  }

  public escalateToLevel4(vector: RiskVector) {
    if (this.level3Timeout) {
      clearTimeout(this.level3Timeout);
      this.level3Timeout = null;
    }
    Vibration.cancel();
    
    console.log('[ESCALATION] Level 4: CRITICAL CONFIDENCE. Dispatching Auto-SOS!');
    
    // Try transmitting the risk vector to the backend API directly
    this.transmitRiskVector(vector);
  }
  
  private async transmitRiskVector(vector: RiskVector) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAppStore, activeTrip } = require('../stores/useAppStore');
    const store = useAppStore.getState();
    const trip = activeTrip(store.trips);
    
    if (!trip) {
      console.warn('[ESCALATION] No active trip found. Cannot route vector to backend trip.');
      return;
    }
    
    const payload = {
      ...vector,
      tripId: trip.id
    };

    try {
      await api.post('/risk/vector', payload);
      console.log('[ESCALATION] Successfully transmitted Risk Vector to Backend.');
    } catch (e) {
      console.error('[ESCALATION] Network failed. Pushing to Outbox and activating Mesh Broadcasting.');
      await outboxQueue.enqueue('risk_vector', payload, 'SOS');
      // Attempt to immediately scream BLE mesh
      await meshService.startBroadcastingSOS(trip.id, 0, 0); // Need actual loc here
    }
  }
}

export const escalationManager = new EscalationManager();
