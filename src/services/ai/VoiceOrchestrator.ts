import { OfflineModelManager } from './OfflineModelManager';
import { llamaEngine } from '@/src/services/llamaEngine';
import { useAppStore } from '@/src/stores/useAppStore';
import * as Location from 'expo-location';
import { HallucinationPreventionService } from './HallucinationPrevention';
import { ToolRegistry } from './ToolRegistry';

export interface OrchestratorResponse {
  text: string;
  language: string;
  intent?: 'medical' | 'sos' | 'navigation' | 'disaster';
  actionTriggered?: string;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

class VoiceOrchestratorService {
  private state: VoiceState = 'idle';
  private onStateChange?: (state: VoiceState) => void;

  public setOnStateChange(callback: (state: VoiceState) => void) {
    this.onStateChange = callback;
  }

  private updateState(newState: VoiceState) {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  public getState(): VoiceState {
    return this.state;
  }

  /**
   * Main entry point for the voice loop.
   * 1. Start STT
   * 2. Generate LLM response
   * 3. Speak TTS
   */
  public async listenAndRespond(
    onPartialUserText?: (text: string) => void,
    onPartialAssistantText?: (text: string) => void,
  ): Promise<OrchestratorResponse> {
    try {
      // 1. Ensure STT is loaded (sequential logic handled by ModelManager)
      await OfflineModelManager.loadSTT();
      const stt = OfflineModelManager.getSTTProvider();

      this.updateState('listening');
      const sttResult = await stt.startListening(onPartialUserText);
      console.log('[VoiceOrchestrator] User said:', sttResult.text);

      if (!sttResult.text || sttResult.text.trim().length < 2) {
        this.updateState('idle');
        return { text: '', language: 'en' };
      }

      this.updateState('processing');

      // 2. Load LLM and Unload STT (saving memory)
      await OfflineModelManager.loadLLM();

      // Determine the conversational language from the global state
      const lang = useAppStore.getState().conversationLanguage || 'en';
      const languageMap: Record<string, string> = {
        en: 'English',
        hi: 'Hindi',
        bn: 'Bengali',
        ta: 'Tamil',
        te: 'Telugu',
      };
      const languageName = languageMap[lang] || 'English';

      const currentLoc = await Location.getCurrentPositionAsync({});
      const latString = currentLoc ? currentLoc.coords.latitude.toFixed(6) : '0.0';
      const lonString = currentLoc ? currentLoc.coords.longitude.toFixed(6) : '0.0';

      const systemPrompt = `You are Yatri AI, an expert emergency voice assistant.
You must output a JSON tool request if you need action or external data.
Allowed tools: "findNearbyHospital", "triggerSOS".
Your current location is lat: ${latString}, lon: ${lonString}.
Output ONLY JSON in this format:
{"tool": "toolName", "arguments": {"key": "value"}}

If you don't need a tool, just answer concisely under 50 words.
CRITICAL: You MUST reply in the ${languageName} language.`;

      let rawLlmResponse = await llamaEngine.generate(systemPrompt, sttResult.text, (partial) => {
        if (onPartialAssistantText) onPartialAssistantText(partial);
      });

      console.log('[VoiceOrchestrator] LLM Raw Response:', rawLlmResponse);

      let cleanText = rawLlmResponse;
      let actionTriggered: string | undefined;

      // Attempt to parse JSON tool request
      try {
        const jsonMatch = rawLlmResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (ToolRegistry.validateRequest(parsed)) {
            const toolResult = await ToolRegistry.executeTool(parsed);

            if (toolResult.requiresConfirmation && parsed.tool === 'triggerSOS') {
              actionTriggered = 'SOS_CONFIRMATION_REQUIRED';
              cleanText = 'I have prepared an SOS alert. Do you want me to trigger it now?';
            } else if (toolResult.success) {
              // Feed verified data back to LLM to explain (simplified for now)
              cleanText = `Here is the verified information: ${JSON.stringify(toolResult.data)}`;
            } else {
              cleanText = "I'm sorry, I could not fetch that information right now.";
            }
          }
        }
      } catch (e) {
        // Not a valid JSON tool request, proceed as normal text
      }

      // Handle old legacy intent tags if they sneak in
      const intentMatch = cleanText.match(/^\[(MEDICAL|SOS|NAVIGATION|DISASTER|GENERAL)\]/i);
      let intent: 'medical' | 'sos' | 'navigation' | 'disaster' | 'general' = 'general';
      if (intentMatch) {
        intent = intentMatch[1].toLowerCase() as any;
        cleanText = cleanText.replace(intentMatch[0], '').trim();
        if (intent === 'sos' && !actionTriggered) {
          actionTriggered = 'SOS_CONFIRMATION_REQUIRED';
          cleanText = 'I have prepared an SOS alert. Please confirm to trigger it.';
        }
      }

      // 3. Hallucination Prevention & TTS
      cleanText = HallucinationPreventionService.sanitizeResponse(cleanText);

      this.updateState('speaking');
      await OfflineModelManager.loadTTS(lang);
      const tts = OfflineModelManager.getTTSProvider();

      await tts.speak(cleanText, lang);

      this.updateState('idle');

      return {
        text: cleanText,
        language: lang,
        intent: intent === 'general' ? undefined : intent,
        actionTriggered,
      };
    } catch (e) {
      console.error('[VoiceOrchestrator] Pipeline error:', e);
      this.updateState('idle');
      throw e;
    }
  }

  public async stop(): Promise<void> {
    this.updateState('idle');
    await OfflineModelManager.unloadAll();
  }
}

export const VoiceOrchestrator = new VoiceOrchestratorService();
