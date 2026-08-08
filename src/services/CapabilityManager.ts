import { useAppStore } from '@/src/stores/useAppStore';

export type AppCapability =
  | 'voice_stt'
  | 'voice_tts'
  | 'llm_chat'
  | 'live_routing'
  | 'offline_routing'
  | 'live_disasters'
  | 'offline_sos'
  | 'live_sos';

class CapabilityManagerService {
  /**
   * Returns true if a specific capability is currently available
   * based on network status and hardware/model loaded status.
   */
  public hasCapability(capability: AppCapability): boolean {
    const isOnline = useAppStore.getState().online;

    switch (capability) {
      case 'voice_stt':
        // Whisper handles offline STT
        return true;
      case 'voice_tts':
        // expo-speech handles offline TTS
        return true;
      case 'llm_chat':
        // We have llama.rn for offline LLM
        return true;
      case 'offline_routing':
        return true; // We use straight line Math fallback
      case 'live_routing':
        return isOnline;
      case 'live_disasters':
        return isOnline;
      case 'live_sos':
        return isOnline;
      case 'offline_sos':
        return true; // BLE Mesh or Queued outbox
      default:
        return false;
    }
  }

  public getCapabilitiesList(): Record<AppCapability, boolean> {
    return {
      voice_stt: this.hasCapability('voice_stt'),
      voice_tts: this.hasCapability('voice_tts'),
      llm_chat: this.hasCapability('llm_chat'),
      live_routing: this.hasCapability('live_routing'),
      offline_routing: this.hasCapability('offline_routing'),
      live_disasters: this.hasCapability('live_disasters'),
      live_sos: this.hasCapability('live_sos'),
      offline_sos: this.hasCapability('offline_sos'),
    };
  }
}

export const CapabilityManager = new CapabilityManagerService();
