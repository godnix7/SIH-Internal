declare module 'whisper.rn' {
  export interface WhisperContext {
    transcribeRealtime(
      options: any,
    ): Promise<{ stop: () => Promise<void>; promise: Promise<{ result: string }> }>;
    release(): Promise<void>;
  }
  export function initWhisper(options: { filePath: string }): Promise<WhisperContext>;
}
