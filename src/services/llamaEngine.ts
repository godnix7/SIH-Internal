/**
 * llamaEngine.ts
 * Wraps llama.rn for on-device Gemma inference.
 * llama.rn uses llama.cpp under the hood and supports GGUF quantized models.
 */
import { initLlama, LlamaContext } from 'llama.rn';

type ProgressCallback = (partial: string) => void;

class LlamaEngineService {
  private context: LlamaContext | null = null;
  private modelPath: string = '';

  public isReady(): boolean {
    return this.context !== null;
  }

  public async loadModel(path: string): Promise<void> {
    // Release any existing context first
    if (this.context) {
      await this.context.release();
      this.context = null;
    }

    this.context = await initLlama({
      model: path,
      // INT4 quantized, optimized for mobile inference
      n_ctx: 2048,
      n_batch: 512,
      n_threads: 4,
      use_mlock: true,
      embedding: false,
    });
    this.modelPath = path;
    console.log('[LLAMA ENGINE] Model loaded from:', path);
  }

  public async generate(
    systemPrompt: string,
    userMessage: string,
    onToken: ProgressCallback,
  ): Promise<string> {
    if (!this.context) {
      throw new Error('LlamaEngine: model not loaded.');
    }

    // Gemma instruct format (strict)
    const prompt =
      `<start_of_turn>user\n` +
      `${systemPrompt}\n\n` +
      `${userMessage}<end_of_turn>\n` +
      `<start_of_turn>model\n`;

    let fullText = '';

    await this.context.completion(
      {
        prompt,
        n_predict: 512,
        temperature: 0.1,
        top_k: 20,
        top_p: 0.8,
        stop: ['<end_of_turn>', '<start_of_turn>'],
      },
      (data) => {
        const token = data.token;
        fullText += token;
        onToken(fullText);
      },
    );

    return fullText.trim();
  }

  public async release(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
      console.log('[LLAMA ENGINE] Context released.');
    }
  }
}

export const llamaEngine = new LlamaEngineService();

