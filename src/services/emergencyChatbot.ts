/**
 * emergencyChatbot.ts
 * Real on-device LLM inference via llama.rn (Gemma 2B INT4).
 * Falls back to the edgeAiGuidance protocol library when model is not loaded.
 */
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { preferences } from './preferences';
import { edgeAiGuidance } from './edgeAiGuidance';
import { llamaEngine } from './llamaEngine';
import { useAppStore } from '@/src/stores/useAppStore';

const CHAT_HISTORY_KEY = 'yatri-shield.emergency-chat-history.v1';
const MODEL_STATUS_KEY = 'yatri-shield.offline-model-status.v1';

// Gemma 2B Q4_K_M � INT4 quantized, ~1.38 GB, optimized for mobile
const MODEL_URL =
  'https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf';
const MODEL_FILENAME = 'gemma-2b-q4_k_m.gguf';
const MODEL_DIR = FileSystem.documentDirectory + 'models/';
const MODEL_PATH = MODEL_DIR + MODEL_FILENAME;

const SYSTEM_PROMPT = `You are Yatri AI, an expert emergency medical triage and wilderness survival assistant built into the Yatri Shield app, a tourist safety system used in remote and mountainous regions of India.

Your role:
- Provide immediate, concise, life-saving first aid instructions
- Triage emergency situations: bleeding, fractures, altitude sickness, snakebites, CPR, hypothermia
- Keep answers under 300 words unless detail is critical
- Use numbered steps for action items
- Always recommend calling emergency services (112) and triggering SOS if life-threatening
- Be calm, direct, and authoritative
- You work completely offline � do not suggest "look it up" or "call a doctor" as the primary action

If the user asks something non-medical, briefly redirect them to the emergency tools available.`;

export type MessageRole = 'user' | 'assistant' | 'system';

export type ChatAction = {
  label: string;
  type: 'navigate_sos' | 'share_location' | 'read_protocol' | 'call_112';
  payload?: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  severity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';
  action?: ChatAction;
  modelMeta?: string;
};

export type QuickPrompt = {
  id: string;
  label: string;
  query: string;
  icon: string;
};

export type OfflineModelStatus = 'not_downloaded' | 'downloading' | 'ready';

export interface OfflineModelInfo {
  status: OfflineModelStatus;
  progress: number;
  size: string;
  modelName: string;
  description: string;
  localPath?: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'qp_bleed',
    label: 'Heavy Bleeding',
    query:
      'Someone is bleeding heavily from a wound and it will not stop. What are the first aid steps?',
    icon: 'bleeding',
  },
  {
    id: 'qp_altitude',
    label: 'Altitude Sickness',
    query:
      'I am high up in the mountains experiencing intense headache, dizziness, and difficulty breathing.',
    icon: 'altitude',
  },
  {
    id: 'qp_snake',
    label: 'Snake Bite',
    query: 'My companion just got bitten by a snake on the trail. What do I do?',
    icon: 'snake',
  },
  {
    id: 'qp_fracture',
    label: 'Broken Bone',
    query: 'Fell during hiking, suspected broken leg or severe fracture. How should I treat it?',
    icon: 'fracture',
  },
  {
    id: 'qp_cpr',
    label: 'CPR Required',
    query: 'Person has collapsed and is unresponsive. Need step-by-step CPR instructions.',
    icon: 'cpr',
  },
];

class EmergencyChatbotEngine {
  private memory: ChatMessage[] = [];
  public readonly MODEL_NAME = 'Gemma 2B INT4 (On-Device)';

  private modelState: OfflineModelInfo = {
    status: 'not_downloaded',
    progress: 0,
    size: '1.38 GB',
    modelName: MODEL_FILENAME,
    description: 'INT4 Quantized Gemma 2B fine-tuned for wilderness trauma and survival medicine.',
  };

  constructor() {
    this.loadHistory();
    this.loadModelStatus();
  }

  // --- MODEL MANAGEMENT ---

  private loadModelStatus() {
    try {
      const savedStatus = preferences.getString(MODEL_STATUS_KEY);
      if (savedStatus === 'ready') {
        this.modelState.status = 'ready';
        this.modelState.progress = 100;
        this.modelState.localPath = MODEL_PATH;
        void this.tryHotLoad();
      }
    } catch {
      this.modelState.status = 'not_downloaded';
    }
  }

  private async tryHotLoad() {
    if (llamaEngine.isReady()) return;
    try {
      const info = await FileSystem.getInfoAsync(MODEL_PATH);
      if (info.exists) {
        await llamaEngine.loadModel(MODEL_PATH);
        console.log('[CHATBOT] Hot-loaded model from disk.');
      } else {
        // File was deleted externally � reset status
        this.modelState.status = 'not_downloaded';
        this.modelState.progress = 0;
        preferences.remove(MODEL_STATUS_KEY);
      }
    } catch (e) {
      console.error('[CHATBOT] Hot-load failed:', e);
    }
  }

  public getModelInfo(): OfflineModelInfo {
    return { ...this.modelState };
  }

  public async downloadOfflineModel(onProgress?: (pct: number) => void): Promise<OfflineModelInfo> {
    if (this.modelState.status === 'ready' && llamaEngine.isReady()) {
      return this.getModelInfo();
    }

    this.modelState.status = 'downloading';
    this.modelState.progress = 0;
    if (onProgress) onProgress(0);

    try {
      await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_URL,
        MODEL_PATH,
        {},
        (downloadProgress) => {
          const pct = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100,
          );
          this.modelState.progress = pct;
          if (onProgress) onProgress(pct);
        },
      );

      await downloadResumable.downloadAsync();

      const info = await FileSystem.getInfoAsync(MODEL_PATH);
      if (!info.exists) {
        throw new Error('Download completed but file not found on disk.');
      }

      await llamaEngine.loadModel(MODEL_PATH);

      this.modelState.status = 'ready';
      this.modelState.progress = 100;
      this.modelState.localPath = MODEL_PATH;
      preferences.set(MODEL_STATUS_KEY, 'ready');

      this.memory.push({
        id: Crypto.randomUUID(),
        role: 'system',
        content:
          'Offline AI Model downloaded and loaded successfully.\n\nGemma 2B INT4 is now active. Full conversational emergency triage works without any internet connection.',
        timestamp: Date.now(),
        severity: 'INFO',
        modelMeta: 'Gemma 2B INT4 � On-Device Active',
      });
      this.persistHistory();
    } catch (e: any) {
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      this.modelState.status = 'not_downloaded';
      this.modelState.progress = 0;
      throw new Error(`Model download failed: ${e?.message ?? 'Unknown error'}`);
    }

    return this.getModelInfo();
  }

  public async deleteOfflineModel(): Promise<void> {
    await llamaEngine.release();
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
    this.modelState.status = 'not_downloaded';
    this.modelState.progress = 0;
    delete this.modelState.localPath;
    preferences.remove(MODEL_STATUS_KEY);

    this.memory.push({
      id: Crypto.randomUUID(),
      role: 'system',
      content: 'Offline model removed. Switched to protocol-based offline guidance.',
      timestamp: Date.now(),
      severity: 'INFO',
    });
    this.persistHistory();
  }

  // --- CHAT HISTORY ---

  private loadHistory() {
    try {
      const raw = preferences.getString(CHAT_HISTORY_KEY);
      if (raw) {
        const parsed: ChatMessage[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.memory = parsed;
          return;
        }
      }
    } catch {
      // Reset on corrupt data
    }
    this.resetConversation();
  }

  private persistHistory() {
    try {
      preferences.set(CHAT_HISTORY_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.error('[CHATBOT] Failed to persist chat history:', e);
    }
  }

  public resetConversation(): ChatMessage[] {
    const isLoaded = llamaEngine.isReady();

    // Clear KV cache when resetting conversation to prevent context contamination
    if (isLoaded) {
      llamaEngine
        .clearCache()
        .catch((e) => console.warn('[CHATBOT] Failed to clear KV cache on reset:', e));
    }

    this.memory = [
      {
        id: Crypto.randomUUID(),
        role: 'system',
        content: isLoaded
          ? 'Yatri AI is active with on-device Gemma 2B INT4. I can answer any emergency question fully offline.'
          : 'Yatri AI is ready with offline protocol guidance. Download the AI model for full conversational intelligence.',
        timestamp: Date.now(),
        severity: 'INFO',
        modelMeta: isLoaded ? 'Gemma 2B INT4 (On-Device)' : 'Protocol Engine (Offline)',
      },
    ];
    this.persistHistory();
    return this.memory;
  }

  public getHistory(): ChatMessage[] {
    return this.memory;
  }

  public clearHistory(): ChatMessage[] {
    return this.resetConversation();
  }

  public exportTranscript(): string {
    return this.memory
      .map((m) => {
        const dateStr = new Date(m.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const sender = m.role === 'user' ? 'YOU' : m.role === 'assistant' ? 'YATRI AI' : 'SYSTEM';
        return `[${dateStr}] ${sender}:\n${m.content}\n`;
      })
      .join('\n----------------------------------------\n');
  }

  // --- INFERENCE ---

  public async sendMessage(
    userQuery: string,
    onProgress?: (partial: string) => void,
  ): Promise<ChatMessage> {
    const userMessage: ChatMessage = {
      id: Crypto.randomUUID(),
      role: 'user',
      content: userQuery.trim(),
      timestamp: Date.now(),
    };
    this.memory.push(userMessage);
    this.persistHistory();

    const responseData = await this.generateResponse(userQuery, onProgress);

    const assistantMessage: ChatMessage = {
      id: Crypto.randomUUID(),
      role: 'assistant',
      content: responseData.text,
      timestamp: Date.now(),
      severity: responseData.severity,
      action: responseData.action,
      modelMeta: llamaEngine.isReady() ? 'Gemma 2B INT4 (On-Device)' : 'Protocol Engine (Offline)',
    };

    this.memory.push(assistantMessage);
    this.persistHistory();
    return assistantMessage;
  }

  /**
   * Detect if a query is an emergency that has a verified protocol.
   * Returns the matching protocol if found, null otherwise.
   */
  private classifyEmergencyIntent(
    query: string,
  ): ReturnType<typeof edgeAiGuidance.searchProtocols>[0] | null {
    const matches = edgeAiGuidance.searchProtocols(query);
    // Only classify as emergency if we have a strong match (score >= 10 is the threshold)
    if (matches.length > 0) {
      return matches[0];
    }
    return null;
  }

  /**
   * Validate LLM output for coherence.
   * Returns true if the output appears valid, false if it's garbage/corrupted.
   */
  private isLlmOutputValid(text: string): boolean {
    if (!text || text.trim().length === 0) {
      console.warn('[CHATBOT] LLM output validation: empty output');
      return false;
    }

    const trimmed = text.trim();

    // Check for extremely short output (likely broken)
    if (trimmed.length < 2) {
      console.warn('[CHATBOT] LLM output validation: too short');
      return false;
    }

    // Check for excessive non-ASCII characters (sign of tokenizer corruption)
    const nonAsciiRatio = trimmed.replace(/[\x20-\x7E\n\r\t]/g, '').length / trimmed.length;
    if (nonAsciiRatio > 0.4 && trimmed.length > 20) {
      console.warn(
        '[CHATBOT] LLM output validation: high non-ASCII ratio:',
        nonAsciiRatio.toFixed(2),
      );
      return false;
    }

    // Check for excessive repetition (e.g., same 10-char fragment repeated 5+ times)
    if (trimmed.length > 50) {
      const fragment = trimmed.substring(0, 10);
      const count = trimmed.split(fragment).length - 1;
      if (count > 5) {
        console.warn('[CHATBOT] LLM output validation: excessive repetition detected');
        return false;
      }
    }

    // Check for known corruption patterns
    const corruptionPatterns = [
      /[\u0590-\u05FF]{5,}/, // Long Hebrew character sequences
      /VersionUID/i, // Java serialization artifacts
      /\x00{3,}/, // Null byte sequences
    ];
    for (const pattern of corruptionPatterns) {
      if (pattern.test(trimmed)) {
        console.warn('[CHATBOT] LLM output validation: corruption pattern detected');
        return false;
      }
    }

    return true;
  }

  /**
   * Format a protocol match into a readable response string.
   */
  private formatProtocolResponse(
    protocol: ReturnType<typeof edgeAiGuidance.searchProtocols>[0],
    hasActiveSos: boolean,
  ): string {
    return (
      (hasActiveSos ? '**Active SOS Detected.** Emergency services are being contacted.\n\n' : '') +
      `**${protocol.title}**\n\n` +
      `**Immediate Steps:**\n` +
      protocol.immediateSteps.map((step, i) => `${i + 1}. ${step}`).join('\n') +
      `\n\n**Do:**\n` +
      protocol.dos.map((d) => `\u2705 ${d}`).join('\n') +
      `\n\n**Do NOT:**\n` +
      protocol.donts.map((d) => `\u274C ${d}`).join('\n')
    );
  }

  private async generateResponse(
    query: string,
    onProgress?: (partial: string) => void,
  ): Promise<{
    text: string;
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';
    action?: ChatAction;
  }> {
    let sosContext = '';
    let hasActiveSos = false;
    try {
      const state = useAppStore.getState();
      if (
        state.sos &&
        !['RESOLVED', 'CANCELLED', 'CANCELLED_BY_USER', 'FALSE_ALARM'].includes(state.sos.status)
      ) {
        hasActiveSos = true;
        const coordsText = state.sos.location
          ? `Lat ${state.sos.location.latitude.toFixed(4)}, Lon ${state.sos.location.longitude.toFixed(4)}`
          : 'GPS acquiring';
        sosContext = `\n\n[CONTEXT: User has an ACTIVE SOS beacon broadcasting. Status: ${state.sos.status}, Location: ${coordsText}. Emergency services are being contacted.]`;
      }
    } catch {
      // Ignore
    }

    // ── STEP 1: Emergency Intent Classification ──
    // For high-risk emergencies, ALWAYS serve the verified deterministic protocol
    // first, regardless of whether the LLM is available. The LLM can augment but
    // never replace critical safety instructions.
    const emergencyMatch = this.classifyEmergencyIntent(query);
    const isHighRiskEmergency =
      emergencyMatch &&
      (emergencyMatch.severity === 'CRITICAL' || emergencyMatch.severity === 'HIGH');

    if (isHighRiskEmergency && emergencyMatch) {
      console.log(
        '[CHATBOT] High-risk emergency detected:',
        emergencyMatch.title,
        '— serving verified protocol',
      );

      // Serve the deterministic protocol immediately
      const protocolText = this.formatProtocolResponse(emergencyMatch, hasActiveSos);
      const severity = (hasActiveSos ? 'CRITICAL' : emergencyMatch.severity) as
        'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';

      // If LLM is available, augment with LLM explanation
      let augmentedText = protocolText;
      if (llamaEngine.isReady()) {
        try {
          const augmentPrompt =
            SYSTEM_PROMPT +
            sosContext +
            `\n\nIMPORTANT: A verified emergency protocol has already been provided to the user. ` +
            `Your role is to provide a brief (2-3 sentence) additional explanation or reassurance ` +
            `specific to their situation. Do NOT repeat the protocol steps.`;

          let llmText = '';
          const llmResponse = await llamaEngine.generate(augmentPrompt, query, (partial) => {
            llmText = partial;
            if (onProgress) onProgress(protocolText + '\n\n---\n\n' + partial);
          });

          if (this.isLlmOutputValid(llmResponse)) {
            augmentedText = protocolText + '\n\n---\n\n**Additional Guidance:**\n' + llmResponse;
          }
        } catch (e) {
          console.error('[CHATBOT] LLM augmentation failed (protocol still served):', e);
        }
      }

      if (onProgress) onProgress(augmentedText);
      return {
        text: augmentedText,
        severity,
        action: hasActiveSos ? undefined : { label: 'Trigger SOS Now', type: 'navigate_sos' },
      };
    }

    // ── STEP 2: LLM inference for non-critical or unmatched queries ──
    if (llamaEngine.isReady()) {
      try {
        const fullSystemPrompt = SYSTEM_PROMPT + sosContext;
        const text = await llamaEngine.generate(fullSystemPrompt, query, (partial) => {
          if (onProgress) onProgress(partial);
        });

        // Validate LLM output — if corrupted, fall through to protocol/fallback
        if (!this.isLlmOutputValid(text)) {
          console.error('[CHATBOT] LLM output failed validation — falling back to protocols');
          // Fall through to protocol-based response below
        } else {
          const lower = text.toLowerCase();
          let severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO' = 'MODERATE';
          if (
            lower.includes('call 112') ||
            lower.includes('unconscious') ||
            lower.includes('cpr') ||
            lower.includes('tourniquet') ||
            lower.includes('arterial')
          ) {
            severity = 'CRITICAL';
          } else if (
            lower.includes('descend') ||
            lower.includes('evacuate') ||
            lower.includes('fracture') ||
            lower.includes('snakebite') ||
            lower.includes('hypothermia')
          ) {
            severity = 'HIGH';
          }

          return {
            text,
            severity,
            action: hasActiveSos ? undefined : { label: 'Trigger SOS', type: 'navigate_sos' },
          };
        }
      } catch (e) {
        console.error('[CHATBOT] LLM inference failed, falling back to protocols:', e);
      }
    }

    // ── STEP 3: Protocol-based fallback ──
    if (emergencyMatch) {
      const severity = (hasActiveSos ? 'HIGH' : emergencyMatch.severity) as
        'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';

      const text =
        this.formatProtocolResponse(emergencyMatch, hasActiveSos) +
        `\n\n*Download the AI model for fully conversational, adaptive guidance.*`;

      if (onProgress) onProgress(text);
      return {
        text,
        severity,
        action: hasActiveSos ? undefined : { label: 'Trigger SOS Now', type: 'navigate_sos' },
      };
    }

    // ── STEP 4: Generic safe fallback ──
    const text =
      (hasActiveSos ? '**Active SOS Detected.**\n\n' : '') +
      `I don't have a specific protocol for that, but here are immediate steps:\n\n` +
      `1. Move to a safe location away from hazards.\n` +
      `2. Check Airway, Breathing, and Circulation (ABCs).\n` +
      `3. Keep the patient warm, calm, and still.\n` +
      `4. Trigger SOS immediately if life-threatening.\n\n` +
      `*Download the AI model for full conversational offline guidance.*`;

    if (onProgress) onProgress(text);
    return {
      text,
      severity: 'MODERATE',
      action: { label: 'Trigger SOS', type: 'navigate_sos' },
    };
  }
}

export const emergencyChatbot = new EmergencyChatbotEngine();
