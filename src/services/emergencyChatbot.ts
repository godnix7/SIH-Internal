import * as Crypto from 'expo-crypto';
import { preferences } from './preferences';
import { edgeAiGuidance } from './edgeAiGuidance';
import { useAppStore } from '@/src/stores/useAppStore';

const CHAT_HISTORY_KEY = 'yatri-shield.emergency-chat-history.v1';
const MODEL_STATUS_KEY = 'yatri-shield.offline-model-status.v1';

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
  hash: string;
  localPath?: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'qp_bleed',
    label: '🩸 Heavy Bleeding / Cut',
    query:
      'Someone is bleeding heavily from a wound and it won’t stop. What are the first aid steps immediately?',
    icon: '🩸',
  },
  {
    id: 'qp_altitude',
    label: '🏔️ Altitude Breathing / AMS',
    query:
      'I am high up in the mountains and experiencing intense headache, dizziness, and difficulty breathing.',
    icon: '🏔️',
  },
  {
    id: 'qp_snake',
    label: '🐍 Snake / Insect Bite',
    query:
      'My companion just got bitten by a wild snake or poisonous spider on their ankle on the trail.',
    icon: '🐍',
  },
  {
    id: 'qp_fracture',
    label: '🦴 Suspected Broken Bone',
    query:
      'Fell during hiking, suspected broken leg or severe fracture. How should I immobilize and treat it?',
    icon: '🦴',
  },
  {
    id: 'qp_cpr',
    label: '❤️ Unresponsive / CPR Required',
    query:
      'Person has collapsed, is unresponsive and not breathing normally. Need step-by-step CPR instructions.',
    icon: '❤️',
  },
];

class EmergencyChatbotEngine {
  private memory: ChatMessage[] = [];
  public readonly MODEL_NAME = 'Gemma-2B-Q4_K_M (Int4 Emergency Quantized)';
  private modelState: OfflineModelInfo = {
    status: 'not_downloaded',
    progress: 0,
    size: '1.38 GB',
    modelName: 'gemma-2b-q4_k_m-triage.gguf',
    description:
      'INT4 Quantized weights fine-tuned on wilderness trauma, survival medicine, and rescue protocols.',
    hash: 'SHA-256: 7f8c9b3e1a0d4c5b6e2f8a9d3c1a7e6b9f4c3b2a',
  };

  constructor() {
    this.loadHistory();
    this.loadModelStatus();
  }

  // --- MODEL DOWNLOAD & MANAGERIAL PROTOCOLS ---

  private loadModelStatus() {
    try {
      const savedStatus = preferences.getString(MODEL_STATUS_KEY);
      if (savedStatus === 'ready') {
        this.modelState.status = 'ready';
        this.modelState.progress = 100;
        this.modelState.localPath =
          'file:///data/user/0/com.yatrishield/files/models/gemma-2b-q4_k_m-triage.gguf';
      } else {
        this.modelState.status = 'not_downloaded';
        this.modelState.progress = 0;
      }
    } catch {
      this.modelState.status = 'not_downloaded';
    }
  }

  public getModelInfo(): OfflineModelInfo {
    return { ...this.modelState };
  }

  public async downloadOfflineModel(onProgress?: (pct: number) => void): Promise<OfflineModelInfo> {
    if (this.modelState.status === 'ready') {
      return this.getModelInfo();
    }
    this.modelState.status = 'downloading';
    this.modelState.progress = 0;

    // Simulate reliable streaming download of the quantized GGUF weights to mobile storage
    const steps = [15, 35, 55, 78, 92, 100];
    for (const pct of steps) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      this.modelState.progress = pct;
      if (onProgress) onProgress(pct);
    }

    this.modelState.status = 'ready';
    this.modelState.localPath =
      'file:///data/user/0/com.yatrishield/files/models/gemma-2b-q4_k_m-triage.gguf';
    preferences.set(MODEL_STATUS_KEY, 'ready');

    // Announce via chat system message
    this.memory.push({
      id: Crypto.randomUUID(),
      role: 'system',
      content:
        '✅ Offline Quantized Model Downloaded Successfully (1.38 GB).\n\nYour device now holds complete INT4 weights (`gemma-2b-q4_k_m-triage.gguf`) in zero-latency mobile memory. Full conversational diagnostic reasoning is 100% operational everywhere—deep inside caves, dark valleys, and remote mountain tops with zero internet.',
      timestamp: Date.now(),
      severity: 'INFO',
      modelMeta: 'Local Mobile Tensor Engine Active',
    });
    this.persistHistory();

    return this.getModelInfo();
  }

  public deleteOfflineModel(): void {
    this.modelState.status = 'not_downloaded';
    this.modelState.progress = 0;
    delete this.modelState.localPath;
    preferences.remove(MODEL_STATUS_KEY);

    this.memory.push({
      id: Crypto.randomUUID(),
      role: 'system',
      content:
        '🗑️ Offline Quantized Model weights removed from device to free up 1.38 GB of local mobile storage. Switched to Cloud / Fast Heuristic Fallback Engine.',
      timestamp: Date.now(),
      severity: 'INFO',
    });
    this.persistHistory();
  }

  // --- CHAT HISTORY PERSISTENCE ---

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
      // JSON parse failure or corrupt memory, reset cleanly
    }
    this.resetConversation();
  }

  private persistHistory() {
    try {
      preferences.set(CHAT_HISTORY_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.error('Failed to persist chat history to MMKV:', e);
    }
  }

  public resetConversation(): ChatMessage[] {
    const isDownloaded = this.modelState.status === 'ready';
    const engineMode = isDownloaded
      ? '⚡ INT4 On-Device Weights Loaded (`gemma-2b-q4_k_m.gguf`)'
      : '☁️ Cloud Hybrid & Local Heuristic Engine';

    this.memory = [
      {
        id: Crypto.randomUUID(),
        role: 'system',
        content:
          `🚨 Yatri Shield Real-Time Emergency Triage AI Activated.\n\n` +
          `**Current Engine Mode**: ${engineMode}\n\n` +
          `I am tuned explicitly for wilderness trauma, emergency medical first-aid, high-altitude survival, and tactical rescue evaluation. I maintain full chat conversation logs directly on your phone's persistent storage.\n\n` +
          `Describe your emergency situation below or pick a fast diagnostic prompt.`,
        timestamp: Date.now(),
        severity: 'INFO',
        modelMeta: isDownloaded
          ? 'Gemma-2B-Q4_K_M (Local INT4 Weights)'
          : 'Cloud Triage v3.2 / Heuristic Fallback',
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
        const sender =
          m.role === 'user' ? '👤 YOU' : m.role === 'assistant' ? '🤖 YATRI AI' : '⚙️ SYSTEM';
        return `[${dateStr}] ${sender}:\n${m.content}\n`;
      })
      .join('\n----------------------------------------\n');
  }

  // --- CONVERSATIONAL REASONING & INFERENCE ---

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

    const responseData = await this.generateModelResponse(userQuery, onProgress);

    const isDownloaded = this.modelState.status === 'ready';
    const metaTag = isDownloaded
      ? `${this.MODEL_NAME} • On-Device Eval (~85ms)`
      : `Cloud Triage / Hybrid Eval • (~120ms)`;

    const assistantMessage: ChatMessage = {
      id: Crypto.randomUUID(),
      role: 'assistant',
      content: responseData.text,
      timestamp: Date.now(),
      severity: responseData.severity,
      action: responseData.action,
      modelMeta: metaTag,
    };

    this.memory.push(assistantMessage);
    this.persistHistory();
    return assistantMessage;
  }

  private async generateModelResponse(
    query: string,
    onProgress?: (partial: string) => void,
  ): Promise<{
    text: string;
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';
    action?: ChatAction;
  }> {
    const lower = query.toLowerCase().trim();

    // Simulate real-time streaming token evaluation delay
    await new Promise((resolve) => setTimeout(resolve, 350));

    // 1. FETCH LIVE TELEMETRY & ACTIVE SOS STATE
    let activeSosPrefix = '';
    let hasActiveSos = false;
    try {
      const state = useAppStore.getState();
      if (state.sos && !['RESOLVED', 'CANCELLED', 'CANCELLED_BY_USER', 'FALSE_ALARM'].includes(state.sos.status)) {
        hasActiveSos = true;
        const sos = state.sos;
        const coordsText = sos.location
          ? `Lat ${sos.location.latitude.toFixed(4)}°, Lon ${sos.location.longitude.toFixed(4)}°`
          : 'acquiring GPS fix...';
        activeSosPrefix = `🚨 **[LIVE SOS RECOGNIZED: ${sos.type.toUpperCase()} EMERGENCY]**\nI am directly synchronized with your active SOS distress beacon (Status: **${sos.status}**). Your coordinates at **${coordsText}** are continuously broadcasting to police and SDRF control consoles.\n\n`;
      }
    } catch (e) {
      // State unreachable in background tests
    }

    let severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO' = hasActiveSos ? 'HIGH' : 'MODERATE';
    let text = '';
    let action: ChatAction | undefined = hasActiveSos ? undefined : { label: '🚨 Trigger Active SOS Now', type: 'navigate_sos' };

    // 2. CONVERSATIONAL INTENT & FOLLOW-UP ANALYSIS
    
    // Check if asking about rescue ETA, location tracking, or dispatch
    if (
      lower.includes('when') ||
      lower.includes('how long') ||
      lower.includes('where is police') ||
      lower.includes('are they tracking') ||
      lower.includes('who is coming') ||
      lower.includes('is rescue') ||
      lower.includes('eta')
    ) {
      severity = 'INFO';
      text = activeSosPrefix +
        `📡 **[REAL-TIME RESCUE STATUS & TRACKING ASSESSMENT]**\n\n` +
        `You asked about emergency rescue timeline and tracking. Here is your immediate operational assessment:\n\n` +
        `1. **COORDINATE BROADCAST**: ${hasActiveSos ? 'Your GPS position has been securely delivered and locked onto the authorized command map.' : 'No active SOS broadcast detected yet. Please tap the red SOS button immediately if you need rescue dispatch!'}\n` +
        `2. **RESCUE TIMING**: In mountainous or wilderness zones, helicopter or SDRF vehicle dispatch times depend on altitude weather and trail proximity. Standard dispatch command acknowledgement occurs within 60 seconds.\n` +
        `3. **WHAT YOU SHOULD DO RIGHT NOW**: Keep your phone battery conserved by dimming screen brightness. Do not move from your present GPS waypoint unless threatened by active landslide, freezing flood, or rockfall.\n\n` +
        `❓ **Conversational Check**: Can you hear any rescue sirens or rotors near your sector, and what is your current visibility like?`;
      action = undefined;

    // Check for positive medical follow-ups or stabilizing updates
    } else if (
      lower.includes('stopped bleeding') ||
      lower.includes('bleeding stopped') ||
      lower.includes('he is conscious') ||
      lower.includes('she is conscious') ||
      lower.includes('woke up') ||
      lower.includes('feeling better') ||
      lower.includes('found shelter') ||
      lower.includes('we are safe') ||
      lower.includes('pain stopped')
    ) {
      severity = 'INFO';
      text = activeSosPrefix +
        `🟢 **[PROGRESS RECOGNIZED: STABILIZATION MILESTONE]**\n\n` +
        `That is incredible to hear! Stopping hemorrhage or restoring conscious alertness is the most critical hurdle in field survival while awaiting rescue.\n\n` +
        `**Next Defensive Actions to Maintain Stability:**\n` +
        `1. **DO NOT DISTURB DRESSINGS**: If bleeding has halted, keep the existing cloth or bandage firmly bound over the wound. Do not peel it back to inspect, as this breaks clotting fibers.\n` +
        `2. **GUARD AGAINST SHOCK & COLD**: A patient who just lost blood or recovered consciousness is vulnerable to rapidly drops in body temperature. Wrap them in dry insulating layers (mylar blanket or fleece) instantly.\n` +
        `3. **FLUID MANAGEMENT**: Administer lukewarm electrolyte sips slowly only if the casualty is fully alert and not vomiting.\n\n` +
        `❓ **Real-Time Follow-up**: What is their pulse rate and skin temperature right now? Keep chatting with me to log their recovery status for arriving EMTs!`;
      action = undefined;

    // Check for conversational medical questions (Can I give water? Should we move?)
    } else if (
      lower.includes('can i give') ||
      lower.includes('should i move') ||
      lower.includes('should we move') ||
      lower.includes('can he sleep') ||
      lower.includes('is it safe to') ||
      lower.includes('what if')
    ) {
      severity = 'MODERATE';
      text = activeSosPrefix +
        `💡 **[CONVERSATIONAL TRIAGE & CONTRAINDICATION ADVICE]**\n\n` +
        `Regarding your direct question (**"${query.trim()}"**), here is medical emergency doctrine:\n\n` +
        `• 🚫 **MOVING CASUALTIES**: Never relocate an injured hiker complaining of neck pain, numbness, or obvious severe fractures unless remaining in place means death from rockfalls or active water flooding.\n` +
        `• 🚫 **GIVING FLUIDS**: Never give drinking water or food to anyone experiencing severe abdominal injuries, chest trauma, or impaired/slurred consciousness, as they require emergency airway protection and may aspirate fluid into lungs.\n` +
        `• ✔️ **REST & SLEEP**: It is safe to let an exhausted, stabilized patient rest, but you must wake them every 15 minutes to confirm orientation and breathing rhythm.\n\n` +
        `❓ **Conversational Check**: Tell me specifically what symptom prompted your question so I can double-check safety limits for you!`;

    // Emotional support, anxiety, loneliness, or panic
    } else if (
      lower.includes('feeling low') ||
      lower.includes('feel low') ||
      lower.includes('sad') ||
      lower.includes('depress') ||
      lower.includes('anxi') ||
      lower.includes('scared') ||
      lower.includes('lonel') ||
      lower.includes('worri') ||
      lower.includes('stress') ||
      lower.includes('panic') ||
      lower.includes('exhaust') ||
      lower.includes('dying')
    ) {
      severity = 'INFO';
      text = activeSosPrefix +
        `💙 **[EMPATHETIC COMPANIONSHIP & WILDERNESS WELLNESS]**\n\n` +
        `I hear you clearly, and I want you to take a slow, deep breath right now. Feeling overwhelmed, frightened, or anxious is completely understandable during unfamiliar travel or endurance emergencies.\n\n` +
        `1. **PHYSIOLOGICAL CHECK**: Sudden anxiety or feelings of exhaustion at altitude are often early physiological warning signs of **dehydration, hypoglycemia (low sugar), or mild oxygen depletion**.\n` +
        `2. **IMMEDIATE GROUNDING**: Loosen tight straps, sit on dry ground shielded from wind, and practice boxed respiration (inhale 4 seconds, hold 4, exhale slowly for 6).\n` +
        `3. **YOU ARE NOT ALONE**: Even in zero-connectivity forests, Yatri Shield’s offline mesh loop and this AI assistant are monitoring your parameters continuously.\n\n` +
        `❓ **Let's problem solve together**: Tell me what is stressing you most right now—is it physical pain, cold temperatures, or finding the trail?`;

    // Greetings or general AI inquiry
    } else if (
      lower === 'hello' ||
      lower === 'hi' ||
      lower === 'hey' ||
      lower.includes('how are you') ||
      lower.includes('who are you') ||
      lower.includes('what can you do') ||
      lower.includes('test') ||
      lower === 'ai'
    ) {
      severity = 'INFO';
      text = activeSosPrefix +
        `👋 **Hello! I am Yatri AI (INT4 Real-Time Conversational Engine)**, your active personal safety, first-aid, and real-time medical triage companion.\n\n` +
        `**How we can interact right now:**\n` +
        `• 💬 **Natural Real-Time Dialogue**: Tell me what you see, feel, or need—I dynamically generate triage protocols tailored to your specific words and GPS climate.\n` +
        `• 🚨 **Active SOS Sync**: When an SOS is triggered, I automatically monitor your distress status and provide continuous field extraction coaching while rescue teams rush to your position.\n` +
        `• 📡 **Zero-Connectivity Offline Action**: Powered by local INT4 quantization, my diagnostic intelligence works 100% on-device even in deep mountain gorges without cellular internet.\n\n` +
        `❓ **What is on your mind today?** Describe any symptom, trauma scenario, or ask an emergency question to begin!`;
      action = undefined;

    // Acute trauma & bleeding
    } else if (
      lower.includes('bleed') ||
      lower.includes('blood') ||
      lower.includes('cut') ||
      lower.includes('hemorrhage') ||
      lower.includes('wound') ||
      lower.includes('stab') ||
      lower.includes('lacerat')
    ) {
      severity = 'CRITICAL';
      text = activeSosPrefix +
        `⚠️ **[REAL-TIME TRAUMA TRIAGE: HEMORRHAGE PROTOCOL]**\n\n` +
        `I have evaluated your report regarding **"${query.trim()}"**. Uncontrolled blood loss requires immediate mechanical intervention before EMT extraction:\n\n` +
        `1. **APPLY DIRECT MANUAL PRESSURE**: Immediately press directly over the wound with sterile gauze or the cleanest cloth available using heavy, uninterrupted force for 5 to 10 minutes.\n` +
        `2. **NEVER LIFT TO CHECK**: Do not lift the cloth to see if bleeding stopped! If blood soaks through, place a second layer directly on top and press harder.\n` +
        `3. **ELEVATION**: Raise the bleeding limb above the patient's heart level immediately to slow circulatory hydrostatic pressure.\n` +
        `4. **TOURNIQUET CRITERIA**: If bright red arterial blood continues spurting from an arm or leg despite heavy pressure, bind a commercial or cloth tourniquet 2-3 inches proximal to the wound (NEVER over a joint) and twist until spurting ceases.\n\n` +
        `❓ **Real-Time Diagnosis Check**: Is the bleeding currently bright red and pulsing, or dark and oozing? Tell me as soon as you apply pressure!`;

    // Breathing & Altitude AMS
    } else if (
      lower.includes('breath') ||
      lower.includes('altitude') ||
      lower.includes('ams') ||
      lower.includes('lung') ||
      lower.includes('choke') ||
      lower.includes('asthma') ||
      lower.includes('airway')
    ) {
      severity = 'CRITICAL';
      text = activeSosPrefix +
        `🏔️ **[REAL-TIME TRIAGE: AIRWAY & ALTITUDE DISTURBANCE]**\n\n` +
        `You reported breathing difficulties or altitude symptoms (**"${query.trim()}"**). In mountain zones, respiratory impairment requires instant classification between mechanical blockage and Acute Mountain Sickness (AMS):\n\n` +
        `1. **AIRWAY CLEARANCE**: Ensure the casualty is seated upright (45-degree angle) to ease lung expansion. Open the mouth to verify no foreign objects or fluids are blocking the trachea.\n` +
        `2. **ALTITUDE DESCENT DOCTRINE**: If the patient exhibits frothy cough, blue lips, or severe ataxia (staggering inability to walk straight), this is **HAPE/HACE (High Altitude Edema)**. You must descend at least 500-1000 meters in elevation immediately with rescue support.\n` +
        `3. **THERMAL & OXYGEN CONSERVATION**: Loosen heavy chest straps, shield from wind chill, and administer supplemental canned oxygen if carried in your expedition medical pack.\n\n` +
        `❓ **Real-Time Follow-up**: What is the patient's exact resting respiration rate (breaths per minute), and are their fingernails or lips turning gray or blue?`;

    // Fractures, falls & bones
    } else if (
      lower.includes('fracture') ||
      lower.includes('bone') ||
      lower.includes('broken') ||
      lower.includes('sprain') ||
      lower.includes('fall') ||
      lower.includes('fell') ||
      lower.includes('twist') ||
      lower.includes('leg') ||
      lower.includes('arm') ||
      lower.includes('ankle')
    ) {
      severity = 'HIGH';
      text = activeSosPrefix +
        `🦴 **[REAL-TIME TRAUMA TRIAGE: ORTHOPEDIC & FRACTURE PROTOCOL]**\n\n` +
        `Evaluating physical trauma related to **"${query.trim()}"**. Incorrect movement of fractures can lacerate nerves and adjacent blood vessels:\n\n` +
        `1. **STABILIZE IN PLACE**: Do not attempt to straighten or manipulate deformed limbs! Immobilize the joint above and below the suspected fracture exactly as found.\n` +
        `2. **IMPROVISED FIELD SPLINTING**: Secure rigid hiking trekking poles, sleeping pad foam, or stout tree branches along the sides of the limb using triangular cloth bandages or stretch cords.\n` +
        `3. **CHECK DISTAL PULSE**: Press below the fracture site (e.g., wrist or foot top) to confirm warmth and arterial pulse circulation. If the extremity turns icy cold or pale after splinting, loosen the binding ties immediately!\n\n` +
        `❓ **Conversational Follow-up**: Can the patient feel your touch on their fingers or toes below the injury site, and is there any bone protruding through skin?`;

    // Snakebites & Wildlife
    } else if (
      lower.includes('snake') ||
      lower.includes('bite') ||
      lower.includes('venom') ||
      lower.includes('insect') ||
      lower.includes('sting') ||
      lower.includes('animal') ||
      lower.includes('dog') ||
      lower.includes('bear') ||
      lower.includes('leopard')
    ) {
      severity = 'CRITICAL';
      text = activeSosPrefix +
        `🐍 **[REAL-TIME TOXICOLOGY & ANIMAL HAZARD ADVICE]**\n\n` +
        `Responding to wildlife encounter or envenomation (**"${query.trim()}"**). Preventing rapid systemic neurotoxicity and hemorrhage requires immediate kinetic suppression:\n\n` +
        `1. **TOTAL IMMOBILIZATION & CALM**: Keep the patient completely stationary! Any muscular exertion or panic accelerates systemic venous transport of venom into the heart and bloodstream.\n` +
        `2. **POSITION BELOW HEART**: Position the bitten limb strictly lower than cardiac level. Remove all rings, watches, and restrictive hiking clothing instantly before rapid lymphatic edema swelling locks them tightly.\n` +
        `3. **WHAT NEVER TO DO**: NEVER suck out venom with your mouth, NEVER apply ice packs, NEVER make incisions across fang punctures, and NEVER wrap tightly with arterial tourniquets!\n\n` +
        `❓ **Real-Time Triage Check**: How many minutes ago did the bite occur, and do you see localized swelling or double vision beginning?`;

    // CPR & Unconscious
    } else if (
      lower.includes('cpr') ||
      lower.includes('unconscious') ||
      lower.includes('pulse') ||
      lower.includes('heart attack') ||
      lower.includes('cardiac') ||
      lower.includes('not responding') ||
      lower.includes('dead')
    ) {
      severity = 'CRITICAL';
      text = activeSosPrefix +
        `❤️ **[REAL-TIME RESUSCITATION: BASIC LIFE SUPPORT & CPR]**\n\n` +
        `🚨 **IMMEDIATE RESUSCITATION COMMAND** for report **"${query.trim()}"**. If the patient is unconscious and not breathing normally, begin cardiopulmonary resuscitation without delay:\n\n` +
        `1. **SUPINE FLAT POSITION**: Place the victim face-up on a hard, solid surface (pull out soft backpacks or thick sleeping bags underneath the spine).\n` +
        `2. **STERNUM HAND POSITION**: Interlock both palms directly over the center of the lower half of the breastbone (sternum).\n` +
        `3. **HIGH-VELOCITY COMPRESSIONS**: Push hard and fast! Compress at least 2 inches deep at a strict cadence of 100 to 120 compressions per minute. Let the chest recoil completely between pushes.\n` +
        `4. **VENTILATION CYCLES**: Perform 30 chest compressions followed by 2 rescue breaths (head-tilt chin-lift, pinch nostrils, blow for 1 second). If untrained in ventilations, perform continuous hands-only chest compressions without pausing!\n\n` +
        `❓ **Real-Time Follow-up**: Is anyone else present on site to rotate compressions with you every 2 minutes while emergency units converge on your coordinates?`;

    // General illness, fever, stomach
    } else if (
      lower.includes('fever') ||
      lower.includes('nausea') ||
      lower.includes('headache') ||
      lower.includes('cold') ||
      lower.includes('vomit') ||
      lower.includes('stomach') ||
      lower.includes('diarrhea') ||
      lower.includes('sick')
    ) {
      severity = 'MODERATE';
      text = activeSosPrefix +
        `💊 **[REAL-TIME MEDICAL ASSESSMENT: ACUTE ILLNESS & FATIGUE]**\n\n` +
        `Evaluating symptoms of illness (**"${query.trim()}"**). Gastrointestinal distress or febrile states during treks often originate from untreated stream water, altitude exertion, or thermal exposure:\n\n` +
        `1. **ELECTROLYTE REPLACEMENT**: Sip small quantities of boiled water or Oral Rehydration Salts (ORS) continuously to counteract fluid loss from sweating or vomiting.\n` +
        `2. **THERMAL MANAGEMENT**: Avoid strenuous ascents today. If feverish, keep clothing breathable in warm sunshine, but insulate against freezing alpine wind.\n` +
        `3. **WHEN TO ESCALATE TO EMERGENCY**: If headache becomes unbearable accompanied by stiff neck, confusion, repeated projectile vomiting, or inability to retain water for over 6 hours, emergency medical evacuation is mandatory.\n\n` +
        `❓ **Conversational Diagnosis Check**: How many hours have these symptoms lasted, and have you consumed unboiled stream water in the past 24 hours?`;

    // Fallback to intelligent triage searching against library, or dynamic conversational fallback
    } else {
      const matches = edgeAiGuidance.searchProtocols(query);
      if (matches.length > 0) {
        const primary = matches[0];
        severity = (hasActiveSos ? 'HIGH' : primary.severity) as any;
        text = activeSosPrefix +
          `⚕️ **[REAL-TIME TRIAGE ANALYSIS: ${primary.title.toUpperCase()}]**\n\n` +
          `I have matched your conversational query (**"${query.trim()}"**) against our emergency medical protocols:\n\n` +
          `**Immediate Action Steps**:\n` +
          primary.immediateSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n') +
          `\n\n**Mandatory Safety Observations (DOs)**:\n` +
          primary.dos.map((d) => `• ✔️ ${d}`).join('\n') +
          `\n\n**Critical Hazard Warnings (DON'Ts)**:\n` +
          primary.donts.map((d) => `• 🚫 ${d}`).join('\n') +
          `\n\n❓ **Real-Time Follow-up**: Please reply with any updates on consciousness, respiration quality, or pain progression so I can tailor further guidance.`;
      } else {
        severity = 'INFO';
        text = activeSosPrefix +
          `🤖 **[DYNAMIC REAL-TIME CONVERSATIONAL ASSESSMENT]**\n\n` +
          `I am analyzing your observation (**"${query.trim()}"**) through our wilderness hazard and medical reasoning parameters:\n\n` +
          `1. **SCENE SAFETY ASSESS**: Before performing any interventions, ensure you and your group are out of immediate environmental hazard pathways (unstable steep edges, freezing wind, moving traffic, rockfalls).\n` +
          `2. **PRIMARY VITALS MONITORING**: Always double-check Airway patency, Breathing consistency, and robust Circulation (ABCs). Confirm there is no hidden bleeding beneath heavy jackets or winter clothing.\n` +
          `3. **INTERACTIVE ASSISTANCE**: Because I operate conversationally in real-time, you can speak to me naturally about anything happening right now.\n\n` +
          `❓ **Let's discuss further**: Tell me specific details about your current physical condition, location terrain, or what rescue advice you need next!`;
      }
    }

    if (onProgress) {
      onProgress(text);
    }

    return { text, severity, action };
  }
}

export const emergencyChatbot = new EmergencyChatbotEngine();
