/**
 * llamaEngine.ts
 * Wraps llama.rn for on-device Gemma inference.
 * llama.rn uses llama.cpp under the hood and supports GGUF quantized models.
 *
 * CRITICAL: Uses the `messages` API (OpenAI-compatible) instead of raw prompt
 * strings. This ensures llama.rn applies the model's native Jinja chat template
 * and inserts special tokens (BOS, <start_of_turn>, <end_of_turn>) as actual
 * token IDs rather than literal text subwords.
 */
import {
  initLlama,
  LlamaContext,
  type RNLlamaOAICompatibleMessage,
  type NativeCompletionResult,
  type TokenData,
} from 'llama.rn';

type ProgressCallback = (partial: string) => void;

/** Diagnostic snapshot captured after each generation */
export type GenerationDiagnostics = {
  modelDesc: string;
  chatTemplateSupport: {
    llamaChat: boolean;
    jinjaDefault: boolean;
    jinjaToolUse: boolean;
  };
  inputMessages: RNLlamaOAICompatibleMessage[];
  formattedPromptPreview: string;
  inputTokenCount: number;
  outputTokenCount: number;
  contextLength: number;
  temperature: number;
  topK: number;
  topP: number;
  minP: number;
  seed: number;
  nPredict: number;
  stopSequences: string[];
  timings: NativeCompletionResult['timings'] | null;
  stoppedEos: boolean;
  stoppedWord: string;
  stoppedLimit: number;
  rawOutputText: string;
  streaming: boolean;
  kvCacheCleared: boolean;
};

/**
 * Default generation parameters — conservative and deterministic for debugging.
 * These can be overridden per-call.
 */
const DEFAULT_GEN_PARAMS = {
  temperature: 0.2,
  top_k: 30,
  top_p: 0.9,
  min_p: 0.05,
  n_predict: 512,
  seed: 42,
  penalty_repeat: 1.1,
  penalty_last_n: 64,
};

/**
 * Stop sequences that are standard across most instruct models.
 * The model's native EOS handling (via the chat template) should also stop
 * generation, but these provide a safety net.
 */
const STOP_SEQUENCES = [
  '<end_of_turn>',
  '<start_of_turn>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
  '</s>',
];

class LlamaEngineService {
  private context: LlamaContext | null = null;
  private modelPath: string = '';
  private _lastDiagnostics: GenerationDiagnostics | null = null;

  public isReady(): boolean {
    return this.context !== null;
  }

  /** Get the last generation diagnostics for the diagnostic screen */
  public getLastDiagnostics(): GenerationDiagnostics | null {
    return this._lastDiagnostics;
  }

  /** Get model metadata from the loaded context */
  public getModelInfo(): {
    desc: string;
    size: number;
    nEmbd: number;
    nParams: number;
    chatTemplates: {
      llamaChat: boolean;
      jinjaDefault: boolean;
      jinjaToolUse: boolean;
    };
    isChatTemplateSupported: boolean;
    metadata: Record<string, any>;
  } | null {
    if (!this.context) return null;
    const m = this.context.model;
    return {
      desc: m.desc,
      size: m.size,
      nEmbd: m.nEmbd,
      nParams: m.nParams,
      chatTemplates: {
        llamaChat: m.chatTemplates.llamaChat,
        jinjaDefault: m.chatTemplates.jinja?.default ?? false,
        jinjaToolUse: m.chatTemplates.jinja?.toolUse ?? false,
      },
      isChatTemplateSupported: m.isChatTemplateSupported,
      metadata: m.metadata as Record<string, any>,
    };
  }

  public async loadModel(path: string): Promise<void> {
    // Release any existing context first
    if (this.context) {
      await this.context.release();
      this.context = null;
    }

    console.log('[LLAMA ENGINE] Loading model from:', path);

    this.context = await initLlama({
      model: path,
      // Gemma 2 supports up to 8192 context; 4096 is a safe default for mobile
      n_ctx: 4096,
      n_batch: 512,
      n_threads: 4,
      use_mlock: true,
      embedding: false,
    });

    this.modelPath = path;

    // Log model metadata for debugging
    const info = this.getModelInfo();
    console.log('[LLAMA ENGINE] ✅ Model loaded successfully');
    console.log('[LLAMA ENGINE] Model desc:', info?.desc);
    console.log('[LLAMA ENGINE] Model params:', info?.nParams);
    console.log(
      '[LLAMA ENGINE] Chat template support — llamaChat:',
      info?.chatTemplates.llamaChat,
      'jinjaDefault:',
      info?.chatTemplates.jinjaDefault,
      'jinjaToolUse:',
      info?.chatTemplates.jinjaToolUse,
    );
    console.log('[LLAMA ENGINE] isChatTemplateSupported:', info?.isChatTemplateSupported);
    console.log('[LLAMA ENGINE] GPU:', this.context.gpu);
    if (!this.context.gpu) {
      console.log('[LLAMA ENGINE] Reason no GPU:', this.context.reasonNoGPU);
    }
    console.log('[LLAMA ENGINE] System info:', this.context.systemInfo);
  }

  /**
   * Generate a response using the model's native chat template via the
   * `messages` API. This is the correct way to interact with instruct models
   * in llama.rn v0.12+.
   *
   * The library automatically:
   * 1. Reads the Jinja chat template from GGUF metadata
   * 2. Formats the messages with correct special tokens (BOS, turn markers)
   * 3. Handles tokenization with proper token IDs
   */
  public async generate(
    systemPrompt: string,
    userMessage: string,
    onToken: ProgressCallback,
  ): Promise<string> {
    if (!this.context) {
      throw new Error('LlamaEngine: model not loaded.');
    }

    // 1. Clear KV cache before each independent generation to prevent
    //    contamination from previous conversations
    console.log('[LLAMA ENGINE] Clearing KV cache before generation...');
    await this.context.clearCache(false);

    // 2. Construct messages using the OpenAI-compatible format.
    //    llama.rn will apply the model's native Jinja chat template
    //    to produce correctly formatted token sequences.
    const messages: RNLlamaOAICompatibleMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];

    console.log('[LLAMA ENGINE] === GENERATION START ===');
    console.log('[LLAMA ENGINE] System prompt length:', systemPrompt.length);
    console.log('[LLAMA ENGINE] User message:', userMessage);

    let fullText = '';
    let tokenCount = 0;

    // 3. Call completion with `messages` instead of raw `prompt`.
    //    This is the key fix — the library handles template formatting.
    const result: NativeCompletionResult = await this.context.completion(
      {
        messages,
        n_predict: DEFAULT_GEN_PARAMS.n_predict,
        temperature: DEFAULT_GEN_PARAMS.temperature,
        top_k: DEFAULT_GEN_PARAMS.top_k,
        top_p: DEFAULT_GEN_PARAMS.top_p,
        min_p: DEFAULT_GEN_PARAMS.min_p,
        seed: DEFAULT_GEN_PARAMS.seed,
        penalty_repeat: DEFAULT_GEN_PARAMS.penalty_repeat,
        penalty_last_n: DEFAULT_GEN_PARAMS.penalty_last_n,
        stop: STOP_SEQUENCES,
        // Let llama.rn handle chat template automatically
        // Use force_pure_content to treat output as plain text (no tool parsing)
        force_pure_content: true,
      },
      (data: TokenData) => {
        const token = data.token;
        fullText += token;
        tokenCount++;
        onToken(fullText);

        // Log first few tokens for debugging
        if (tokenCount <= 5) {
          console.log(`[LLAMA ENGINE] Token #${tokenCount}: "${token}"`);
        }
      },
    );

    // 4. Use the result's `text` field as the canonical output
    //    (this is the complete decoded text from the native side)
    const outputText = result.text?.trim() || fullText.trim();

    // 5. Capture diagnostics
    this._lastDiagnostics = {
      modelDesc: this.context.model.desc,
      chatTemplateSupport: {
        llamaChat: this.context.model.chatTemplates.llamaChat,
        jinjaDefault: this.context.model.chatTemplates.jinja?.default ?? false,
        jinjaToolUse: this.context.model.chatTemplates.jinja?.toolUse ?? false,
      },
      inputMessages: messages,
      formattedPromptPreview: `[messages API — ${messages.length} messages]`,
      inputTokenCount: result.tokens_evaluated,
      outputTokenCount: result.tokens_predicted,
      contextLength: 4096,
      temperature: DEFAULT_GEN_PARAMS.temperature,
      topK: DEFAULT_GEN_PARAMS.top_k,
      topP: DEFAULT_GEN_PARAMS.top_p,
      minP: DEFAULT_GEN_PARAMS.min_p,
      seed: DEFAULT_GEN_PARAMS.seed,
      nPredict: DEFAULT_GEN_PARAMS.n_predict,
      stopSequences: STOP_SEQUENCES,
      timings: result.timings,
      stoppedEos: result.stopped_eos,
      stoppedWord: result.stopped_word || result.stopping_word || '',
      stoppedLimit: result.stopped_limit,
      rawOutputText: outputText,
      streaming: true,
      kvCacheCleared: true,
    };

    // 6. Log generation stats
    console.log('[LLAMA ENGINE] === GENERATION COMPLETE ===');
    console.log('[LLAMA ENGINE] Tokens evaluated (input):', result.tokens_evaluated);
    console.log('[LLAMA ENGINE] Tokens predicted (output):', result.tokens_predicted);
    console.log('[LLAMA ENGINE] Stopped EOS:', result.stopped_eos);
    console.log('[LLAMA ENGINE] Stopping word:', result.stopping_word || 'none');
    console.log('[LLAMA ENGINE] Context full:', result.context_full);
    if (result.timings) {
      console.log(
        '[LLAMA ENGINE] Speed:',
        result.timings.predicted_per_second?.toFixed(1),
        'tokens/sec',
      );
    }
    console.log('[LLAMA ENGINE] Output (first 200 chars):', outputText.substring(0, 200));

    return outputText;
  }

  /**
   * Isolated diagnostic generation for testing.
   * Bypasses all chatbot business logic and emergency handling.
   * Performs a clean: load → clear cache → tokenize → generate → decode cycle.
   */
  public async diagnosticGenerate(userMessage: string): Promise<{
    output: string;
    tokenIds: number[];
    decodedTokens: string;
    timings: NativeCompletionResult['timings'] | null;
    inputTokenCount: number;
    outputTokenCount: number;
  }> {
    if (!this.context) {
      throw new Error('LlamaEngine: model not loaded.');
    }

    console.log('[LLAMA ENGINE] === DIAGNOSTIC GENERATION ===');
    console.log('[LLAMA ENGINE] Input:', userMessage);

    // 1. Clear KV cache completely (including data)
    await this.context.clearCache(true);

    // 2. Tokenize the raw input for diagnostic logging
    const tokenized = await this.context.tokenize(userMessage);
    console.log('[LLAMA ENGINE] Input token IDs:', tokenized.tokens.slice(0, 20));

    // 3. Detokenize to verify round-trip
    const detokenized = await this.context.detokenize(tokenized.tokens);
    console.log('[LLAMA ENGINE] Detokenized input:', detokenized);

    // 4. Generate with minimal messages
    const messages: RNLlamaOAICompatibleMessage[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    let fullText = '';
    const result = await this.context.completion(
      {
        messages,
        n_predict: 128,
        temperature: 0.1,
        top_k: 10,
        top_p: 0.9,
        min_p: 0.05,
        seed: 42,
        stop: STOP_SEQUENCES,
        force_pure_content: true,
      },
      (data: TokenData) => {
        fullText += data.token;
      },
    );

    const output = result.text?.trim() || fullText.trim();
    console.log('[LLAMA ENGINE] Diagnostic output:', output);
    console.log(
      '[LLAMA ENGINE] Tokens: in=',
      result.tokens_evaluated,
      'out=',
      result.tokens_predicted,
    );

    return {
      output,
      tokenIds: tokenized.tokens,
      decodedTokens: detokenized,
      timings: result.timings,
      inputTokenCount: result.tokens_evaluated,
      outputTokenCount: result.tokens_predicted,
    };
  }

  /** Clear the KV cache explicitly (used when resetting conversations) */
  public async clearCache(): Promise<void> {
    if (this.context) {
      await this.context.clearCache(false);
      console.log('[LLAMA ENGINE] KV cache cleared.');
    }
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
