export type EmergencyProtocol = {
  id: string;
  title: string;
  category:
    | 'Trauma & Wound'
    | 'Environmental & Altitude'
    | 'Cardiovascular'
    | 'Toxicology & Bites'
    | 'Neurological & Fractures';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  keywords: string[];
  symptoms: string[];
  immediateSteps: string[];
  dos: string[];
  donts: string[];
  voicePrompt: string;
};

export class EdgeAIGuidanceService {
  private readonly protocols: EmergencyProtocol[] = [
    {
      id: 'HEMORRHAGE_01',
      title: 'Severe Arterial & Venous Hemorrhage',
      category: 'Trauma & Wound',
      severity: 'CRITICAL',
      keywords: [
        'bleed',
        'bleeding',
        'blood',
        'hemorrhage',
        'arterial',
        'cut',
        'gushing',
        'wound',
        'stab',
      ],
      symptoms: [
        'Continuous blood flow from wound',
        'Spurring or pulsating bright red blood',
        'Dizziness or cold clammy skin',
      ],
      immediateSteps: [
        'Apply direct, heavy physical pressure directly over the wound using a clean cloth, sterile gauze, or gloved hand immediately.',
        'If blood soaked through the gauze, DO NOT remove it; stack additional sterile padding directly on top and press harder.',
        "Elevate the injured limb above the level of the patient's heart if no spinal or long-bone fractures are suspected.",
        'If arterial bleeding continues unabated on a limb after 3 minutes of maximum pressure, apply a commercial or improvised tourniquet 2-3 inches above the wound (never over a joint).',
      ],
      dos: [
        'Maintain continuous pressure without lifting to check the wound.',
        'Keep the victim calm, warm, and lying down to conserve core blood flow.',
        'Note the exact time if a tourniquet is applied (write ' +
          "'T' and time on patient's forehead).",
      ],
      donts: [
        'DO NOT remove impaled objects (shattered glass, metal); bandage bulky packing around the object to lock it in place.',
        'DO NOT loosen or release a tourniquet once it has been applied.',
      ],
      voicePrompt:
        'Apply immediate heavy direct pressure to the bleeding wound using a clean cloth. Do not lift the cloth. Elevate the injured limb above heart level and keep the patient still.',
    },
    {
      id: 'FRACTURE_SPINAL_02',
      title: 'Suspected Spinal or Long-Bone Fracture',
      category: 'Neurological & Fractures',
      severity: 'CRITICAL',
      keywords: [
        'break',
        'broken',
        'bone',
        'fracture',
        'spine',
        'neck',
        'paralyzed',
        'fall',
        'immovable',
        'snap',
      ],
      symptoms: [
        'Visible deformity or abnormal limb angulation',
        'Severe local agony upon slight palpation or movement',
        'Inability to move fingers or toes after high-angle fall',
      ],
      immediateSteps: [
        'Immobilize the patient completely in the exact position found. DO NOT attempt to realign or straighten twisted limbs or spine.',
        'If cervical spine trauma is possible, designate one responder to hold manual cranial immobilization (stabilize head and neck firmly in neutral inline position).',
        'For extremeties, assemble an improvised rigorous rigid splint using hiking trekking poles, rigid branches, or foam bedding pads secured above and below the fractured joint.',
        'Monitor distal vascularity by checking pulse, sensation, and capillary refill on hands or feet past the fracture point.',
      ],
      dos: [
        'Pad all rigid splint materials thoroughly before binding with fabric straps or bandages.',
        'Keep the patient insulated from cold ground temperatures using thermal emergency space blankets.',
      ],
      donts: [
        'NEVER reposition or pull a suspected spinal injury victim unless facing immediate fatal environmental hazard (fire, rockfall).',
        'DO NOT bind splints so tightly that distal blood pulse disappears.',
      ],
      voicePrompt:
        'Do not move the victim if spinal or neck injury is suspected. Keep them completely still and warm. For limb fractures, immobilize the limb in its current position using rigid padding above and below the fracture joint.',
    },
    {
      id: 'ALTITUDE_EDEMA_03',
      title: 'Acute Mountain Sickness & Pulmonary Edema (HAPE)',
      category: 'Environmental & Altitude',
      severity: 'HIGH',
      keywords: [
        'altitude',
        'mountain',
        'breathless',
        'hape',
        'coughing',
        'pink sputum',
        'dizziness',
        'high altitude',
        'shortness of breath',
      ],
      symptoms: [
        'Extreme dyspnea (shortness of breath) while at rest at elevations above 2,500 meters',
        'Persistent persistent hacking cough sometimes producing pink frothy sputum',
        'Extreme lethargy, cyanosis (blue fingernails/lips), and severe throbbing headache',
      ],
      immediateSteps: [
        'EMERGENCY DESCENT IS THE ONLY DEFINITIVE TREATMENT. Immediately initiate immediate safe downward transit by a minimum of 500 to 1,000 altitude meters.',
        'Keep the victim sitting upright in a comfortable position during rest breaks to ease pulmonary lung pressure; avoid lying flat.',
        'If high-pressure supplementary O2 canisters or portable hyperbaric compression bags (Gamow bag) are accessible in expedition supplies, administer at 2-4 L/min immediately.',
        'Keep the patient thermally protected from extreme ambient cold while avoiding physical exertion during descent (use stretchers or pack horses if possible).',
      ],
      dos: [
        'Hydrate with warm fluids if patient is totally alert and conscious.',
        'Descend even during nighttime hours if resting pulmonary distress worsens.',
      ],
      donts: [
        'NEVER ascend to a higher sleeping elevation once mild altitude sickness symptoms begin.',
        'DO NOT administer respiratory depressants (alcohol, sedatives, sleeping pills).',
      ],
      voicePrompt:
        'Emergency descent is immediately required. Move the patient down at least 500 meters in elevation immediately. Keep them upright to ease breathing and provide oxygen if available.',
    },
    {
      id: 'TOXIC_SNAKEBITE_04',
      title: 'Venomous Snake & Viper Envenomation',
      category: 'Toxicology & Bites',
      severity: 'HIGH',
      keywords: ['snake', 'bite', 'venom', 'viper', 'cobra', 'fang', 'swelling', 'sting', 'poison'],
      symptoms: [
        'Distinct puncture marks or parallel fang scratches',
        'Rapidly progressing local tissue swelling and intense burning localized torment',
        'Metallic taste in mouth, tingling sensations, or progressive muscle weakness',
      ],
      immediateSteps: [
        'Evacuate the patient to a secure zone away from the strike perimeter. DO NOT attempt to hunt, trap, or capture the offending animal.',
        'Enforce absolute physical calmness and muscular immobilization. Keep the affected limb completely resting AT or slightly BELOW heart level to slow lymphatic absorption.',
        'Gently cleanse surface wounds with clean boiled water or saline without rubbing or abrading the cutaneous tissue.',
        'Remove all rings, tight metallic bracelets, watches, and restrictive boots before severe localized lymphatic swelling develops.',
      ],
      dos: [
        'Take a fast photo of the animal from a safe distance (>6 feet) solely for hospital antivenom species identification if safe to do so.',
        'Mark the expanding edge of localized skin edema every 15 minutes with a ballpoint pen to track systemic venom diffusion rates for emergency physicians.',
      ],
      donts: [
        'NEVER apply suction devices, incision incisions, mouth sucking, or electrical current to snake bites.',
        'DO NOT apply ice packs or tight vascular tourniquets to bitten extremeties.',
      ],
      voicePrompt:
        'Keep the victim completely calm and still. Keep the bitten limb resting below heart level to slow venom circulation. Do not cut the wound or attempt to suck out venom. Seek immediate emergency medical evacuation.',
    },
    {
      id: 'HYPOTHERMIA_05',
      title: 'Severe Wilderness Hypothermia & Cold Exposure',
      category: 'Environmental & Altitude',
      severity: 'HIGH',
      keywords: [
        'cold',
        'hypothermia',
        'shivering',
        'frozen',
        'frostbite',
        'snow',
        'slurred speech',
        'stiff',
        'numb',
      ],
      symptoms: [
        'Violent shivering that suddenly stops despite continuous freezing ambient cold',
        'Slurred confusion, stumbling ataxia, and paradoxical undressing behavior',
        'Extremely slow radial pulse and cold marble-like peripheral skin texture',
      ],
      immediateSteps: [
        'Extract the patient from wind, snow, or rain exposures into a sheltered tent, vehicle, or dry insulated cavern.',
        'Gently peel off all wet, sweat-soaked, or iced clothing garments and wrap in multiple layers of dry fleece, synthetic sleeping bags, and reflective emergency space foils.',
        'Apply chemical heat packs, warm water flasks, or body-heat insulation exclusively to the thoracic core axis (armpits, neck, groin, chest).',
        'Handle hypothermic patients with extreme gentleness; abrupt jostling or rough lifting can induce fatal ventricular fibrillation in a cooled myocardium.',
      ],
      dos: [
        'Feed sweet warm non-caffeinated drinks exclusively if the patient is fully coherent and capable of autonomous deglutition.',
        'Insulate the victim thoroughly from freezing underlying terrain using stacked backpacks, pine boughs, or sleeping pads.',
      ],
      donts: [
        'DO NOT vigorously massage or rub freezing peripheral extremeties (arms/legs).',
        'DO NOT expose hypothermic limbs directly to open fire flames or scalding water immersion.',
      ],
      voicePrompt:
        'Move the patient to a dry wind-sheltered area. Remove wet clothing immediately and insulate with dry warm layers. Apply warm water bottles to the chest, neck, and armpits. Handle the victim gently.',
    },
  ];

  public searchProtocols(query: string): EmergencyProtocol[] {
    if (!query || !query.trim()) {
      return this.protocols;
    }
    const cleanQuery = query.toLowerCase().trim();
    const tokens = cleanQuery.split(/\s+/);

    return this.protocols
      .map((protocol) => {
        let score = 0;
        if (protocol.title.toLowerCase().includes(cleanQuery)) score += 10;
        if (protocol.category.toLowerCase().includes(cleanQuery)) score += 5;

        protocol.keywords.forEach((kw) => {
          if (cleanQuery.includes(kw.toLowerCase())) score += 6;
          tokens.forEach((token) => {
            if (kw.toLowerCase().startsWith(token) || token.startsWith(kw.toLowerCase()))
              score += 3;
          });
        });

        protocol.symptoms.forEach((sym) => {
          if (sym.toLowerCase().includes(cleanQuery)) score += 4;
        });

        return { protocol, score };
      })
      .filter((item) => item.score > 0 || !query)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.protocol);
  }

  public getProtocolsByCategory(category?: string): EmergencyProtocol[] {
    if (!category || category === 'All') return this.protocols;
    return this.protocols.filter((p) => p.category === category);
  }

  public getProtocolById(id: string): EmergencyProtocol | undefined {
    return this.protocols.find((p) => p.id === id);
  }

  public getAllCategories(): string[] {
    return [
      'All',
      'Trauma & Wound',
      'Environmental & Altitude',
      'Toxicology & Bites',
      'Neurological & Fractures',
    ];
  }
}

export const edgeAiGuidance = new EdgeAIGuidanceService();
