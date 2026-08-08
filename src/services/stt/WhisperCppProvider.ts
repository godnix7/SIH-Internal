import { initWhisper, type WhisperContext } from 'whisper.rn';
import type { OfflineSTTProvider, STTResult } from './OfflineSTTProvider';
import { Platform } from 'react-native';

export class WhisperCppProvider implements OfflineSTTProvider {
  private whisperContext: WhisperContext | null = null;
  private isListening = false;
  private stopTranscribing: (() => Promise<void>) | null = null;

  async initialize(): Promise<void> {
    if (this.whisperContext) return;

    try {
      console.log('[WhisperCpp] Initializing STT model...');

      // We assume the model is bundled in assets or downloaded.
      // For this implementation, we try to load a default tiny model from assets
      // (which requires the app to bundle it, usually requires expo-asset or direct path)
      // Note: A real production app might use RNFS to download it to DocumentDirectoryPath first.

      // Basic initialization (in a real app, pass the absolute path to the .bin model file)
      // If no file path is given, this will fail. We need a way to pass the model path.
      // Assuming a model has been downloaded to a local path or bundled:
      const modelPath = Platform.OS === 'ios' ? 'ggml-tiny.bin' : 'assets/ggml-tiny.bin';

      this.whisperContext = await initWhisper({
        filePath: modelPath,
      });

      console.log('[WhisperCpp] Initialized successfully.');
    } catch (error) {
      console.error('[WhisperCpp] Failed to initialize:', error);
      throw error;
    }
  }

  async startListening(onPartialResult?: (partial: string) => void): Promise<STTResult> {
    if (!this.whisperContext) {
      throw new Error('Whisper context not initialized. Call initialize() first.');
    }
    if (this.isListening) {
      throw new Error('Already listening');
    }

    this.isListening = true;
    console.log('[WhisperCpp] Starting to listen...');

    return new Promise((resolve, reject) => {
      this.whisperContext!.transcribeRealtime({
        language: 'en', // Can be parameterized based on centralized state
        onProgress: (progress: number) => {
          console.log('[WhisperCpp] Progress:', progress);
        },
        onNewSegments: (result: { result: string }) => {
          console.log('[WhisperCpp] New Segments:', result);
          if (onPartialResult && result.result) {
            onPartialResult(result.result);
          }
        },
      })
        .then(
          ({
            stop,
            promise,
          }: {
            stop: () => Promise<void>;
            promise: Promise<{ result: string }>;
          }) => {
            this.stopTranscribing = stop;
            return promise;
          },
        )
        .then((result: { result: string }) => {
          this.isListening = false;
          resolve({
            text: result.result,
            language: 'en',
            confidence: 0.95, // mock confidence
          });
        })
        .catch((err: unknown) => {
          this.isListening = false;
          this.stopTranscribing = null;
          reject(err);
        });
    });
  }

  async stopListening(): Promise<STTResult> {
    if (!this.isListening || !this.stopTranscribing) {
      throw new Error('Not currently listening');
    }

    console.log('[WhisperCpp] Stop listening requested...');
    await this.stopTranscribing();
    this.stopTranscribing = null;
    this.isListening = false;

    // The startListening promise will resolve with the final result.
    // For this API to return it synchronously, we could store the last result,
    // but typically we await the promise returned by startListening in the caller.
    return {
      text: 'Final result handled by startListening promise',
      language: 'en',
      confidence: 1.0,
    };
  }

  async unload(): Promise<void> {
    if (this.isListening && this.stopTranscribing) {
      await this.stopTranscribing();
    }
    if (this.whisperContext) {
      console.log('[WhisperCpp] Releasing context...');
      await this.whisperContext.release();
      this.whisperContext = null;
    }
  }

  isReady(): boolean {
    return this.whisperContext !== null;
  }
}
