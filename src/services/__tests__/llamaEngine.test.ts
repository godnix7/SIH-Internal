/**
 * llamaEngine.test.ts
 * Unit tests for the LLM engine service.
 *
 * These tests mock llama.rn to verify:
 * - Correct usage of the `messages` API (not raw prompt)
 * - KV cache clearing between generations
 * - Diagnostic data capture
 * - Model metadata exposure
 * - Error handling
 */

// Mock llama.rn before importing the engine
const mockCompletion = jest.fn();
const mockClearCache = jest.fn();
const mockRelease = jest.fn();
const mockTokenize = jest.fn();
const mockDetokenize = jest.fn();

const mockContext = {
  id: 1,
  gpu: false,
  reasonNoGPU: 'test-environment',
  devices: [],
  systemInfo: 'test',
  model: {
    desc: 'gemma-2-2b-it Q4_K_M',
    size: 1380000000,
    nEmbd: 2048,
    nParams: 2000000000,
    is_recurrent: false,
    is_hybrid: false,
    chatTemplates: {
      llamaChat: true,
      jinja: {
        default: true,
        defaultCaps: {
          tools: false,
          toolCalls: false,
          systemRole: true,
          parallelToolCalls: false,
        },
        toolUse: false,
      },
    },
    metadata: {
      'tokenizer.chat_template': '<start_of_turn>...',
      'general.architecture': 'gemma2',
    },
    isChatTemplateSupported: true,
  },
  completion: mockCompletion,
  clearCache: mockClearCache,
  release: mockRelease,
  tokenize: mockTokenize,
  detokenize: mockDetokenize,
};

jest.mock('llama.rn', () => ({
  initLlama: jest.fn().mockResolvedValue(mockContext),
  LlamaContext: jest.fn(),
}));

import { initLlama } from 'llama.rn';
import { llamaEngine } from '../llamaEngine';

describe('LlamaEngineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set mock implementations after clearAllMocks (which removes them)
    (initLlama as jest.Mock).mockResolvedValue(mockContext);
    // Default mock: completion returns a valid result
    mockCompletion.mockResolvedValue({
      text: '4',
      content: '4',
      reasoning_content: '',
      tool_calls: [],
      chat_format: 0,
      tokens_predicted: 1,
      tokens_evaluated: 15,
      draft_tokens: 0,
      draft_tokens_accepted: 0,
      truncated: false,
      stopped_eos: true,
      stopped_word: '',
      stopped_limit: 0,
      stopping_word: '',
      context_full: false,
      interrupted: false,
      tokens_cached: 15,
      timings: {
        cache_n: 0,
        prompt_n: 15,
        prompt_ms: 100,
        prompt_per_token_ms: 6.67,
        prompt_per_second: 150,
        predicted_n: 1,
        predicted_ms: 50,
        predicted_per_token_ms: 50,
        predicted_per_second: 20,
      },
    });
    mockClearCache.mockResolvedValue(undefined);
    mockRelease.mockResolvedValue(undefined);
    mockTokenize.mockResolvedValue({
      tokens: [1, 2, 3, 4, 5],
      has_media: false,
      bitmap_hashes: [],
      chunk_pos: [],
      chunk_pos_media: [],
    });
    mockDetokenize.mockResolvedValue('What is 2 + 2?');
  });

  afterEach(async () => {
    // Release engine between tests
    await llamaEngine.release();
  });

  describe('loadModel', () => {
    it('should load a model and report ready', async () => {
      await llamaEngine.loadModel('/path/to/model.gguf');
      expect(llamaEngine.isReady()).toBe(true);
    });

    it('should expose model metadata after loading', async () => {
      await llamaEngine.loadModel('/path/to/model.gguf');
      const info = llamaEngine.getModelInfo();
      expect(info).not.toBeNull();
      expect(info?.desc).toBe('gemma-2-2b-it Q4_K_M');
      expect(info?.chatTemplates.llamaChat).toBe(true);
      expect(info?.chatTemplates.jinjaDefault).toBe(true);
      expect(info?.isChatTemplateSupported).toBe(true);
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      await llamaEngine.loadModel('/path/to/model.gguf');
    });

    it('should use messages API instead of raw prompt', async () => {
      const onToken = jest.fn();
      await llamaEngine.generate('You are a helpful AI.', 'What is 2 + 2?', onToken);

      expect(mockCompletion).toHaveBeenCalledTimes(1);
      const callArgs = mockCompletion.mock.calls[0][0];

      // CRITICAL: Must use `messages` array, NOT raw `prompt` string
      expect(callArgs.messages).toBeDefined();
      expect(Array.isArray(callArgs.messages)).toBe(true);
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful AI.',
      });
      expect(callArgs.messages[1]).toEqual({
        role: 'user',
        content: 'What is 2 + 2?',
      });

      // Should NOT have a manually constructed prompt with <start_of_turn> tags
      // (the library handles template formatting internally)
      if (callArgs.prompt) {
        expect(callArgs.prompt).not.toContain('<start_of_turn>');
      }
    });

    it('should clear KV cache before each generation', async () => {
      const onToken = jest.fn();
      await llamaEngine.generate('System', 'Hello', onToken);

      expect(mockClearCache).toHaveBeenCalledTimes(1);
      expect(mockClearCache).toHaveBeenCalledWith(false);

      // Verify clearCache is called BEFORE completion
      const clearCacheOrder = mockClearCache.mock.invocationCallOrder[0];
      const completionOrder = mockCompletion.mock.invocationCallOrder[0];
      expect(clearCacheOrder).toBeLessThan(completionOrder);
    });

    it('should include stop sequences', async () => {
      const onToken = jest.fn();
      await llamaEngine.generate('System', 'Hello', onToken);

      const callArgs = mockCompletion.mock.calls[0][0];
      expect(callArgs.stop).toBeDefined();
      expect(Array.isArray(callArgs.stop)).toBe(true);
      expect(callArgs.stop.length).toBeGreaterThan(0);
      expect(callArgs.stop).toContain('<end_of_turn>');
      expect(callArgs.stop).toContain('</s>');
    });

    it('should set conservative generation parameters', async () => {
      const onToken = jest.fn();
      await llamaEngine.generate('System', 'Hello', onToken);

      const callArgs = mockCompletion.mock.calls[0][0];
      expect(callArgs.temperature).toBeLessThanOrEqual(0.5);
      expect(callArgs.top_k).toBeDefined();
      expect(callArgs.top_p).toBeDefined();
      expect(callArgs.seed).toBeDefined();
      expect(callArgs.n_predict).toBeDefined();
      expect(callArgs.n_predict).toBeGreaterThan(0);
    });

    it('should capture diagnostics after generation', async () => {
      const onToken = jest.fn();
      await llamaEngine.generate('System', 'What is 2 + 2?', onToken);

      const diagnostics = llamaEngine.getLastDiagnostics();
      expect(diagnostics).not.toBeNull();
      expect(diagnostics?.modelDesc).toBe('gemma-2-2b-it Q4_K_M');
      expect(diagnostics?.inputTokenCount).toBe(15);
      expect(diagnostics?.outputTokenCount).toBe(1);
      expect(diagnostics?.kvCacheCleared).toBe(true);
      expect(diagnostics?.stoppedEos).toBe(true);
    });

    it('should return trimmed output text', async () => {
      mockCompletion.mockResolvedValueOnce({
        text: '  The answer is 4.  ',
        content: '  The answer is 4.  ',
        reasoning_content: '',
        tool_calls: [],
        chat_format: 0,
        tokens_predicted: 5,
        tokens_evaluated: 15,
        draft_tokens: 0,
        draft_tokens_accepted: 0,
        truncated: false,
        stopped_eos: true,
        stopped_word: '',
        stopped_limit: 0,
        stopping_word: '',
        context_full: false,
        interrupted: false,
        tokens_cached: 15,
        timings: null,
      });

      const onToken = jest.fn();
      const result = await llamaEngine.generate('System', 'What is 2 + 2?', onToken);
      expect(result).toBe('The answer is 4.');
    });

    it('should throw when model is not loaded', async () => {
      await llamaEngine.release();
      expect(llamaEngine.isReady()).toBe(false);

      const onToken = jest.fn();
      await expect(llamaEngine.generate('System', 'Hello', onToken)).rejects.toThrow(
        'model not loaded',
      );
    });
  });

  describe('diagnosticGenerate', () => {
    beforeEach(async () => {
      await llamaEngine.loadModel('/path/to/model.gguf');
    });

    it('should clear KV cache with data flag', async () => {
      await llamaEngine.diagnosticGenerate('What is 2 + 2?');
      expect(mockClearCache).toHaveBeenCalledWith(true);
    });

    it('should tokenize and detokenize the input for diagnostics', async () => {
      const result = await llamaEngine.diagnosticGenerate('What is 2 + 2?');

      expect(mockTokenize).toHaveBeenCalledWith('What is 2 + 2?');
      expect(mockDetokenize).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
      expect(result.tokenIds).toEqual([1, 2, 3, 4, 5]);
      expect(result.decodedTokens).toBe('What is 2 + 2?');
    });

    it('should use messages API with only user message (no system)', async () => {
      await llamaEngine.diagnosticGenerate('What is 2 + 2?');

      const callArgs = mockCompletion.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages[0].role).toBe('user');
      expect(callArgs.messages[0].content).toBe('What is 2 + 2?');
    });
  });

  describe('clearCache', () => {
    it('should clear cache when model is loaded', async () => {
      await llamaEngine.loadModel('/path/to/model.gguf');
      await llamaEngine.clearCache();
      expect(mockClearCache).toHaveBeenCalled();
    });

    it('should not throw when model is not loaded', async () => {
      await llamaEngine.release();
      await expect(llamaEngine.clearCache()).resolves.toBeUndefined();
    });
  });
});
