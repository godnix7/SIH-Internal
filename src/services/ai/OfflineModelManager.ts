import { llamaEngine } from '@/src/services/llamaEngine';
import type { OfflineSTTProvider } from '@/src/services/stt/OfflineSTTProvider';
import { WhisperCppProvider } from '@/src/services/stt/WhisperCppProvider';
import { ExpoTTSProvider, type TTSProvider } from '@/src/services/tts/ExpoTTSProvider';

export type ModelType = 'STT' | 'LLM' | 'TTS';

export interface ModelStatus {
  isLoaded: boolean;
  version?: string;
  language?: string;
}

/**
 * Manages the sequential loading and unloading of heavy AI models to prevent OOM
 * (Out of Memory) crashes on mobile devices.
 *
 * Rules:
 * - Sequential lifecycle: Load STT -> Transcribe -> Unload STT -> Load LLM -> Generate -> Unload LLM -> Load TTS -> Speak
 * - Provides memory management and error recovery.
 */
class OfflineModelManagerService {
  private sttProvider: OfflineSTTProvider;
  private ttsProvider: TTSProvider;

  // Status tracking
  private loadedModels: Set<ModelType> = new Set();

  // LLM path (could be fetched from a config or download manager)
  private llmPath: string = '';

  constructor() {
    this.sttProvider = new WhisperCppProvider();
    this.ttsProvider = new ExpoTTSProvider();
  }

  public setLlmPath(path: string) {
    this.llmPath = path;
  }

  // --- STT ---
  public async loadSTT(): Promise<void> {
    try {
      console.log('[OfflineModelManager] Loading STT...');
      // To strictly save memory, unload LLM if it's currently loaded
      if (this.loadedModels.has('LLM')) {
        await this.unloadLLM();
      }

      await this.sttProvider.initialize();
      this.loadedModels.add('STT');
      console.log('[OfflineModelManager] STT loaded.');
    } catch (e) {
      console.error('[OfflineModelManager] Failed to load STT:', e);
      throw e;
    }
  }

  public async unloadSTT(): Promise<void> {
    try {
      if (!this.loadedModels.has('STT')) return;
      console.log('[OfflineModelManager] Unloading STT...');
      await this.sttProvider.unload();
      this.loadedModels.delete('STT');
      console.log('[OfflineModelManager] STT unloaded.');
    } catch (e) {
      console.error('[OfflineModelManager] Failed to unload STT:', e);
    }
  }

  public getSTTProvider(): OfflineSTTProvider {
    return this.sttProvider;
  }

  // --- LLM ---
  public async loadLLM(): Promise<void> {
    try {
      if (!this.llmPath) throw new Error('LLM path not set. Call setLlmPath() first.');

      console.log('[OfflineModelManager] Loading LLM...');
      // To strictly save memory, unload STT and TTS if they are loaded
      if (this.loadedModels.has('STT')) await this.unloadSTT();
      if (this.loadedModels.has('TTS')) await this.unloadTTS();

      await llamaEngine.loadModel(this.llmPath);
      this.loadedModels.add('LLM');
      console.log('[OfflineModelManager] LLM loaded.');
    } catch (e) {
      console.error('[OfflineModelManager] Failed to load LLM:', e);
      throw e;
    }
  }

  public async unloadLLM(): Promise<void> {
    try {
      if (!this.loadedModels.has('LLM')) return;
      console.log('[OfflineModelManager] Unloading LLM...');
      await llamaEngine.release();
      this.loadedModels.delete('LLM');
      console.log('[OfflineModelManager] LLM unloaded.');
    } catch (e) {
      console.error('[OfflineModelManager] Failed to unload LLM:', e);
    }
  }

  // --- TTS ---
  public async loadTTS(language: string): Promise<void> {
    try {
      console.log(`[OfflineModelManager] Loading TTS for ${language}...`);
      // To strictly save memory, unload LLM
      if (this.loadedModels.has('LLM')) await this.unloadLLM();

      await this.ttsProvider.loadVoice(language);
      this.loadedModels.add('TTS');
      console.log('[OfflineModelManager] TTS loaded.');
    } catch (e) {
      console.error('[OfflineModelManager] Failed to load TTS:', e);
      throw e;
    }
  }

  public async unloadTTS(): Promise<void> {
    try {
      if (!this.loadedModels.has('TTS')) return;
      console.log('[OfflineModelManager] Unloading TTS...');
      await this.ttsProvider.unload();
      this.loadedModels.delete('TTS');
      console.log('[OfflineModelManager] TTS unloaded.');
    } catch (e) {
      console.error('[OfflineModelManager] Failed to unload TTS:', e);
    }
  }

  public getTTSProvider(): TTSProvider {
    return this.ttsProvider;
  }

  // --- Diagnostic ---
  public getModelStatus(): Record<ModelType, ModelStatus> {
    return {
      STT: { isLoaded: this.loadedModels.has('STT') },
      LLM: { isLoaded: this.loadedModels.has('LLM') },
      TTS: { isLoaded: this.loadedModels.has('TTS') },
    };
  }

  public isLanguageSupported(language: string): boolean {
    // Basic implementation - assume English and Hindi are supported if models exist
    return ['en', 'hi'].includes(language);
  }

  public async unloadAll(): Promise<void> {
    await this.unloadSTT();
    await this.unloadLLM();
    await this.unloadTTS();
  }
}

export const OfflineModelManager = new OfflineModelManagerService();
