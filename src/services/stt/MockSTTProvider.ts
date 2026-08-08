import type { OfflineSTTProvider, STTResult } from './OfflineSTTProvider';

export class MockSTTProvider implements OfflineSTTProvider {
  private ready = false;

  async initialize(): Promise<void> {
    console.log('[MockSTT] Initializing...');
    // Simulate loading a model
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.ready = true;
    console.log('[MockSTT] Initialized');
  }

  async startListening(onPartialResult?: (partial: string) => void): Promise<STTResult> {
    if (!this.ready) throw new Error('STT Provider not initialized');

    console.log('[MockSTT] Listening...');

    // Simulate speech processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (onPartialResult) onPartialResult('This is');

    await new Promise((resolve) => setTimeout(resolve, 500));
    if (onPartialResult) onPartialResult('This is a test');

    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('[MockSTT] Stopped listening');
    return {
      text: 'This is a test.',
      language: 'en',
      confidence: 0.99,
    };
  }

  async stopListening(): Promise<STTResult> {
    console.log('[MockSTT] Stop requested');
    return {
      text: 'This is a test.',
      language: 'en',
      confidence: 0.99,
    };
  }

  async unload(): Promise<void> {
    console.log('[MockSTT] Unloading...');
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }
}
