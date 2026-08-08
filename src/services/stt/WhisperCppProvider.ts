import { initWhisper, type WhisperContext } from 'whisper.rn';
import type { OfflineSTTProvider, STTResult } from './OfflineSTTProvider';
import { Platform, PermissionsAndroid } from 'react-native';
import { documentDirectory, getInfoAsync, downloadAsync } from 'expo-file-system/legacy';
import AudioRecord from 'react-native-audio-record';

export class WhisperCppProvider implements OfflineSTTProvider {
  private whisperContext: WhisperContext | null = null;
  private isListening = false;
  private stopTranscribing: (() => Promise<void>) | null = null;
  private audioInitialized = false;

  constructor() {}

  private async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        return grants === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles automatically via plist
  }

  async initialize(): Promise<void> {
    if (this.whisperContext) return;
    const modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
    const modelPath = `${documentDirectory}ggml-tiny.bin`;

    try {
      const fileInfo = await getInfoAsync(modelPath);

      if (!fileInfo.exists) {
        console.log('[WhisperCpp] Downloading model from:', modelUrl);
        await downloadAsync(modelUrl, modelPath);
        console.log('[WhisperCpp] Download complete');
      } else {
        console.log('[WhisperCpp] Model already exists locally:', modelPath);
      }

      this.whisperContext = await initWhisper({ filePath: modelPath });

      // Initialize the audio recorder for Whisper (16kHz PCM WAV)
      if (!this.audioInitialized) {
        AudioRecord.init({
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6, // 6 = VOICE_RECOGNITION
          wavFile: 'whisper_voice.wav',
        });
        this.audioInitialized = true;
      }

      console.log('[WhisperCpp] Initialized successfully.');
    } catch (e) {
      console.error('[WhisperCpp] Initialization failed:', e);
      throw e;
    }
  }

  async startListening(onPartialResult?: (partial: string) => void): Promise<STTResult> {
    if (!this.whisperContext) {
      return Promise.reject(new Error('Whisper model not initialized'));
    }

    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      return Promise.reject(new Error('Microphone permission denied'));
    }

    this.isListening = true;

    // Start recording audio
    AudioRecord.start();
    if (onPartialResult) {
      onPartialResult('Listening...');
    }

    return new Promise((resolve, reject) => {
      this.stopTranscribing = async () => {
        try {
          const audioFile = await AudioRecord.stop();
          this.isListening = false;

          if (onPartialResult) {
            onPartialResult('Processing speech...');
          }

          // Transcribe the recorded WAV file
          const { result } = await this.whisperContext!.transcribe({
            language: 'en',
            path: audioFile,
          });

          resolve({
            text: result || 'Could not recognize speech.',
            language: 'en',
            confidence: 0.95,
          });
        } catch (e) {
          this.isListening = false;
          reject(e);
        }
      };
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
