export interface STTResult {
  text: string;
  language: string;
  confidence: number;
}

export interface OfflineSTTProvider {
  /**
   * Initialize the STT engine.
   * Downloads or loads the model if not already present.
   */
  initialize(): Promise<void>;

  /**
   * Start listening and transcribing.
   * Returns a promise that resolves with the transcribed text.
   */
  startListening(onPartialResult?: (partial: string) => void): Promise<STTResult>;

  /**
   * Stop listening immediately and return the final transcription.
   */
  stopListening(): Promise<STTResult>;

  /**
   * Unload the STT model from memory to free up resources.
   */
  unload(): Promise<void>;

  /**
   * Check if the STT engine is currently loaded and ready.
   */
  isReady(): boolean;
}
