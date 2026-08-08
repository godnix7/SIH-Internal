import * as Speech from 'expo-speech';

export interface TTSProvider {
  /**
   * Initialize or load the voice for a specific language.
   */
  loadVoice(language: string): Promise<void>;

  /**
   * Speak the given text.
   */
  speak(text: string, language?: string): Promise<void>;

  /**
   * Stop speaking.
   */
  stop(): Promise<void>;

  /**
   * Unload voice resources.
   */
  unload(): Promise<void>;
}

export class ExpoTTSProvider implements TTSProvider {
  private currentLanguage: string = 'en';

  async loadVoice(language: string): Promise<void> {
    console.log(`[ExpoTTS] Loading voice for ${language}...`);
    // expo-speech uses OS native voices. We don't have to download weights,
    // but we can check if the voice is available.
    const voices = await Speech.getAvailableVoicesAsync();

    // Check if we have a voice for the requested language
    const langCode = language === 'hi' ? 'hi-IN' : 'en-US';
    const voice = voices.find(
      (v) => v.language.startsWith(langCode) || v.language.startsWith(language),
    );

    if (!voice) {
      console.warn(
        `[ExpoTTS] No native voice found for language: ${language}. Will fallback to default.`,
      );
    }

    this.currentLanguage = language;
    console.log(`[ExpoTTS] Voice setup complete for ${language}.`);
  }

  speak(text: string, language?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const langToUse = language || this.currentLanguage;
      const langCode = langToUse === 'hi' ? 'hi-IN' : 'en-US';

      console.log(`[ExpoTTS] Speaking: "${text}" in ${langCode}`);

      Speech.speak(text, {
        language: langCode,
        onDone: () => resolve(),
        onError: (err) => reject(err),
      });
    });
  }

  async stop(): Promise<void> {
    console.log('[ExpoTTS] Stopping speech.');
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      Speech.stop();
    }
  }

  async unload(): Promise<void> {
    console.log('[ExpoTTS] Unloading voice resources.');
    await this.stop();
  }
}
