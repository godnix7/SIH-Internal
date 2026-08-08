/**
 * emergencyChatbot.test.ts
 * Tests for the emergency chatbot service.
 *
 * Verifies:
 * - Emergency intent classification
 * - LLM output validation (garbage detection)
 * - Protocol fallback architecture
 * - Safety-critical emergency responses always use verified protocols
 */

// Mock dependencies
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2)),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn(),
}));

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(() => null),
    set: jest.fn(),
    getBoolean: jest.fn(),
    remove: jest.fn(),
  })),
}));

jest.mock('../llamaEngine', () => {
  const isReady = jest.fn().mockReturnValue(false);
  return {
    llamaEngine: {
      isReady,
      generate: jest.fn(),
      clearCache: jest.fn().mockResolvedValue(undefined),
      loadModel: jest.fn(),
      release: jest.fn(),
      getModelInfo: jest.fn(() => null),
      getLastDiagnostics: jest.fn(() => null),
    },
  };
});

jest.mock('@/src/stores/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(() => ({ sos: null })),
  },
}));

import { emergencyChatbot } from '../emergencyChatbot';
import { llamaEngine } from '../llamaEngine';

// Re-type for test access
const mockLlamaEngine = llamaEngine as jest.Mocked<typeof llamaEngine>;

describe('EmergencyChatbotEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockLlamaEngine.isReady as jest.Mock).mockReturnValue(false);
    (mockLlamaEngine.clearCache as jest.Mock).mockResolvedValue(undefined);
    (mockLlamaEngine.generate as jest.Mock).mockResolvedValue('');
    emergencyChatbot.resetConversation();
  });

  describe('Emergency Intent Classification', () => {
    it('should classify snake bite as HIGH-risk emergency', async () => {
      const response = await emergencyChatbot.sendMessage(
        'My companion just got bitten by a snake on the trail. What do I do?',
      );
      // Should match the snake bite protocol
      expect(response.content).toContain('Venomous Snake');
      expect(response.content).toContain('Immediate Steps');
      expect(['HIGH', 'CRITICAL']).toContain(response.severity);
    });

    it('should classify heavy bleeding as CRITICAL emergency', async () => {
      const response = await emergencyChatbot.sendMessage(
        'Someone is bleeding heavily from a wound and it will not stop',
      );
      expect(response.content).toContain('Hemorrhage');
      expect(response.content).toContain('Immediate Steps');
      expect(response.severity).toBe('CRITICAL');
    });

    it('should classify altitude sickness correctly', async () => {
      const response = await emergencyChatbot.sendMessage(
        'I am high up in the mountains experiencing intense headache and difficulty breathing',
      );
      expect(response.content).toContain('Mountain Sickness');
      expect(response.content).toContain('Immediate Steps');
    });

    it('should provide protocol response for fracture emergency', async () => {
      const response = await emergencyChatbot.sendMessage(
        'Fell during hiking, suspected broken leg or severe fracture',
      );
      expect(response.content).toContain('Fracture');
      expect(response.content).toContain('Immediate Steps');
    });
  });

  describe('Non-Emergency Queries Without LLM', () => {
    it('should provide generic fallback for non-emergency queries', async () => {
      const response = await emergencyChatbot.sendMessage('What is 2 + 2?');
      // Without LLM and without matching protocol, should give generic advice
      expect(response.content).toContain('immediate steps');
      expect(response.content).toContain('Download the AI model');
    });

    it('should provide generic fallback for greeting', async () => {
      const response = await emergencyChatbot.sendMessage('Hello');
      expect(response.content).toContain('immediate steps');
    });
  });

  describe('LLM Output Validation', () => {
    beforeEach(() => {
      (mockLlamaEngine.isReady as jest.Mock).mockReturnValue(true);
    });

    it('should accept valid LLM output', async () => {
      (mockLlamaEngine.generate as jest.Mock).mockResolvedValue('The answer is 4.');

      const response = await emergencyChatbot.sendMessage('What is 2 + 2?');
      expect(response.content).toBe('The answer is 4.');
      expect(response.modelMeta).toContain('Gemma');
    });

    it('should reject corrupted LLM output with Hebrew characters', async () => {
      (mockLlamaEngine.generate as jest.Mock).mockResolvedValue(
        'שדגכעיחלקפצמנהבטסאורזעיגדכךלןםפןצןמנהבט some *eVersionUID garbage text 12345',
      );

      const response = await emergencyChatbot.sendMessage('What is 2 + 2?');
      // Should fall through to fallback since output is corrupted
      expect(response.content).not.toContain('שדגכעיחלקפצמנהבטסאורזעיגדכךלןםפןצןמנהבט');
    });

    it('should reject empty LLM output', async () => {
      (mockLlamaEngine.generate as jest.Mock).mockResolvedValue('');

      const response = await emergencyChatbot.sendMessage('What is 2 + 2?');
      // Should fall through to fallback
      expect(response.content).toContain('immediate steps');
    });

    it('should reject highly repetitive LLM output', async () => {
      const repeatedFragment = 'ABCDEFGHIJ';
      (mockLlamaEngine.generate as jest.Mock).mockResolvedValue(repeatedFragment.repeat(10));

      const response = await emergencyChatbot.sendMessage('What is 2 + 2?');
      // Should fall through to fallback
      expect(response.content).not.toContain(repeatedFragment.repeat(10));
    });

    it('should accept valid LLM output for emergency query when protocol is critical', async () => {
      (mockLlamaEngine.generate as jest.Mock).mockResolvedValue(
        'Stay calm and keep the bitten area still. Help is coming.',
      );

      const response = await emergencyChatbot.sendMessage(
        'My companion just got bitten by a snake on the trail. What do I do?',
      );
      // Should contain the protocol steps (deterministic) PLUS optionally LLM augmentation
      expect(response.content).toContain('Immediate Steps');
      expect(response.content).toContain('Venomous Snake');
    });

    it('should still serve protocol even when LLM fails for emergency', async () => {
      (mockLlamaEngine.generate as jest.Mock).mockRejectedValue(new Error('LLM crashed'));

      const response = await emergencyChatbot.sendMessage(
        'My companion just got bitten by a snake on the trail. What do I do?',
      );
      // Protocol should still be served
      expect(response.content).toContain('Venomous Snake');
      expect(response.content).toContain('Immediate Steps');
    });
  });

  describe('KV Cache Management', () => {
    it('should call clearCache on conversation reset when LLM is ready', () => {
      (mockLlamaEngine.isReady as jest.Mock).mockReturnValue(true);
      emergencyChatbot.resetConversation();
      expect(mockLlamaEngine.clearCache).toHaveBeenCalled();
    });

    it('should not call clearCache when LLM is not ready', () => {
      (mockLlamaEngine.isReady as jest.Mock).mockReturnValue(false);
      (mockLlamaEngine.clearCache as jest.Mock).mockClear();
      emergencyChatbot.resetConversation();
      expect(mockLlamaEngine.clearCache).not.toHaveBeenCalled();
    });
  });

  describe('Chat History', () => {
    it('should record user and assistant messages', async () => {
      await emergencyChatbot.sendMessage('Hello');
      const history = emergencyChatbot.getHistory();
      // Should have: system message + user message + assistant response
      expect(history.length).toBeGreaterThanOrEqual(3);
      const userMessages = history.filter((m) => m.role === 'user');
      const assistantMessages = history.filter((m) => m.role === 'assistant');
      expect(userMessages.length).toBe(1);
      expect(assistantMessages.length).toBe(1);
      expect(userMessages[0].content).toBe('Hello');
    });

    it('should clear history and reset on clearHistory', () => {
      emergencyChatbot.clearHistory();
      const history = emergencyChatbot.getHistory();
      // Should have only the system welcome message
      expect(history.length).toBe(1);
      expect(history[0].role).toBe('system');
    });

    it('should export transcript in readable format', async () => {
      await emergencyChatbot.sendMessage('Test message');
      const transcript = emergencyChatbot.exportTranscript();
      expect(transcript).toContain('YOU');
      expect(transcript).toContain('YATRI AI');
      expect(transcript).toContain('Test message');
    });
  });

  describe('Regression Tests', () => {
    it('"2 + 2" should produce coherent response (protocol fallback)', async () => {
      const response = await emergencyChatbot.sendMessage('2 + 2');
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(5);
    });

    it('"Hello" should produce coherent response', async () => {
      const response = await emergencyChatbot.sendMessage('Hello');
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(5);
    });

    it('"Capital of France" should produce coherent response (fallback)', async () => {
      const response = await emergencyChatbot.sendMessage('What is the capital of France?');
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(5);
    });

    it('Snake bite should contain safety protocol', async () => {
      const response = await emergencyChatbot.sendMessage('My companion was bitten by a snake.');
      expect(response.content).toContain('Immediate Steps');
      expect(response.content).not.toContain('VersionUID');
    });

    it('should not produce random Hebrew/symbols', async () => {
      const response = await emergencyChatbot.sendMessage('Say hello');
      expect(response.content).not.toMatch(/[\u0590-\u05FF]{5,}/);
    });
  });
});
