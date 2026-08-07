import { NativeModules, NativeEventEmitter } from 'react-native';

const { LlamaContext } = NativeModules;
const LlamaEventEmitter = LlamaContext ? new NativeEventEmitter(LlamaContext) : null;

export class LlamaEngine {
  private isLoaded: boolean = false;
  private modelPath: string = '';

  constructor() {}

  public getIsSupported(): boolean {
    return !!LlamaContext;
  }

  public async init(modelPath: string): Promise<boolean> {
    if (!LlamaContext) {
      console.warn('LlamaContext NativeModule is not available. Using fallback heuristics.');
      return false;
    }

    try {
      // Simulate initializing the context with quantized parameters
      const result = await LlamaContext.initContext({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_batch: 512,
        n_threads: 4,
      });
      if (result) {
        this.isLoaded = true;
        this.modelPath = modelPath;
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to initialize Llama context:', e);
      return false;
    }
  }

  public async generate(prompt: string, onProgress: (text: string) => void): Promise<string> {
    if (!this.isLoaded || !LlamaContext || !LlamaEventEmitter) {
      throw new Error('LlamaEngine not initialized.');
    }

    return new Promise((resolve, reject) => {
      let fullResponse = '';

      const subscription = LlamaEventEmitter.addListener('onToken', (event: { token: string }) => {
        fullResponse += event.token;
        onProgress(fullResponse);
      });

      LlamaContext.completion({
        prompt: prompt,
        n_predict: 256,
        temperature: 0.3,
        top_k: 40,
        top_p: 0.9,
      })
        .then((result: { text: string }) => {
          subscription.remove();
          resolve(result.text);
        })
        .catch((e: Error) => {
          subscription.remove();
          reject(e);
        });
    });
  }

  public async release(): Promise<void> {
    if (this.isLoaded && LlamaContext) {
      await LlamaContext.releaseContext();
      this.isLoaded = false;
    }
  }
}

export const llamaEngine = new LlamaEngine();
