export class HallucinationPreventionService {
  /**
   * List of dangerous phrases that the AI might hallucinate if it gets confused.
   */
  private static DANGEROUS_PATTERNS = [
    /I (have|just)? (called|dispatched) (an ambulance|the police|help)/i,
    /help is on the way/i,
    /I am a doctor/i,
    /the road is (clear|safe)/i,
    /(don't|do not) call \d+/i, // e.g. "don't call 112"
  ];

  /**
   * Evaluates the LLM output and strips or overrides hallucinated safety claims.
   * This guarantees that the LLM cannot act as the authoritative safety system.
   */
  public static sanitizeResponse(text: string): string {
    let sanitized = text;
    let hallucinationDetected = false;

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        hallucinationDetected = true;
        // Strip the offending phrase
        sanitized = sanitized.replace(pattern, '[Filtered unsafe claim]');
      }
    }

    // If a dangerous claim was detected, append a hardcoded safety disclaimer.
    if (hallucinationDetected) {
      sanitized +=
        ' Disclaimer: I am an AI, not a human operator. If this is an emergency, trigger the SOS button immediately.';
    }

    return sanitized;
  }
}
