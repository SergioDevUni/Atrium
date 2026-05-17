import { detectRedFlags, highestSafetyLevel } from "./safety";
import type {
  CaseGraph,
  IntakeQuestionSlot,
  IntakeScopeCategory,
  IntakeUiKind,
  Language,
  QuestionLedgerEntry,
} from "./types";

export const MIN_QUESTION_LIMIT = 2;
export const SOFT_QUESTION_LIMIT = 6;
export const HARD_QUESTION_LIMIT = 10;
export const OFF_TOPIC_STOP_LIMIT = 3;

type ScopeContext = {
  language: Language;
  currentQuestion?: string;
  questionCount?: number;
  allowedChoices?: string[];
};

type SlotQuestionSpec = {
  assistantMessage: string;
  nextQuestion: string;
  questionSlot: IntakeQuestionSlot;
  scopeCategory?: IntakeScopeCategory;
  completionReason?: string;
  ui: {
    type: IntakeUiKind;
    title: string;
    summary: string;
    priority: "routine" | "watch" | "urgent";
    facts: Array<{ label: string; value: string }>;
    choices: string[];
    actions: string[];
  };
};

const clearOffTopicPattern =
  /\b(weather|forecast|sports?|football|soccer|basketball|baseball|crypto|stock|stocks|bitcoin|movie|movies|recipe|joke|poem|story|code|coding|javascript|python|homework|math problem|president|election|news|song|lyrics|music|video game|translate|capital of|who won|write an email|write a post|tell me about)\b/i;
const medicalBoundaryPattern =
  /\b(diagnose me|diagnosis|what do i have|do i have|is this cancer|is it cancer|prescribe|prescription|dosage|dose|antibiotic|opioid|give me medicine|what medicine|should i take|can i take|cure me|treat me)\b/i;
const emergencyPattern =
  /\b(can't breathe|cannot breathe|severe chest|chest pressure|chest pain|fainting|face droop|slurred speech|one-sided weakness|swollen tongue|throat swelling|uncontrolled bleeding|suicide|kill myself|no puedo respirar|dolor de pecho|presi[oó]n en el pecho|desmayo|cara ca[ií]da|lengua hinchada|sangrado no controlado|suicidio|matarme)\b/i;
const healthPattern =
  /\b(pain|ache|hurt|pressure|burning|numb|tingl|cramp|fever|cough|breath|nausea|vomit|diarrhea|dizzy|rash|bleed|allerg|medicine|medication|pregnan|surgery|history|started|worse|better|constant|comes and goes|feel|feeling|sick|unwell|ill|weak|fatigue|tired|awful|not well|not sure|symptom|issue|problem|concern|worried|head|neck|chest|stom(?:ach|atch|ache|ac)|tummy|abdomen|belly|back|arm|hand|leg|foot|dolor|duele|presi[oó]n|ardor|entum|hormigue|c[oó]lico|fiebre|tos|aire|n[aá]usea|v[oó]mito|diarrea|mareo|sangr|alerg|medicamento|embaraz|cirug|empez|inicio|peor|mejor|siento|sentir|mal|enferm|d[eé]bil|cansad|s[ií]ntoma|problema|preocupa|no s[eé]|cabeza|cuello|pecho|est[oó]mago|barriga|panza|espalda|brazo|mano|pierna|pie)\b/i;
const greetingWordPattern =
  /\b(hi|hello|hey|yo|good morning|good afternoon|good evening|hola|buenas|buenos d[ií]as|buenas tardes|buenas noches)\b/i;
const assistantAddressPattern = /\b(gemini|atrium|atlas|assistant|ai|copilot|bot|doctor|doc)\b/i;

export function classifyIntakeScope(answer: string, context: ScopeContext) {
  const text = answer.trim();
  const normalizedAnswer = normalizeQuestionText(text);
  const allowedChoices = (context.allowedChoices ?? []).map(normalizeQuestionText);

  if (!text) {
    return { category: "in_scope" as IntakeScopeCategory, reason: "empty fallback answer" };
  }

  if (emergencyPattern.test(text)) {
    return { category: "emergency" as IntakeScopeCategory, reason: "emergency keyword matched" };
  }

  if (medicalBoundaryPattern.test(text)) {
    return { category: "medical_boundary" as IntakeScopeCategory, reason: "diagnosis or prescription request" };
  }

  if (clearOffTopicPattern.test(text)) {
    return { category: "off_topic" as IntakeScopeCategory, reason: "clear non-health topic" };
  }

  if (healthPattern.test(text)) {
    return { category: "in_scope" as IntakeScopeCategory, reason: "health or intake keyword matched" };
  }

  if (isGreetingOnlyInput(text)) {
    return { category: "greeting" as IntakeScopeCategory, reason: "greeting without symptom signal" };
  }

  if (allowedChoices.includes(normalizedAnswer)) {
    return { category: "in_scope" as IntakeScopeCategory, reason: "selected visible answer choice" };
  }

  if ((context.questionCount ?? 0) > 0 && context.currentQuestion && text.length <= 90) {
    return { category: "in_scope" as IntakeScopeCategory, reason: "short answer to active intake question" };
  }

  if (looksLikeOpeningIntakeQuestion(context.currentQuestion) && text.length <= 120) {
    return { category: "in_scope" as IntakeScopeCategory, reason: "short answer to opening health question" };
  }

  return { category: "off_topic" as IntakeScopeCategory, reason: "no intake signal found" };
}

export function normalizeQuestionText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|is|are|was|were|do|does|did|can|could|would|should|you|your|it|this|that|que|como|cuando|donde|el|la|los|las|un|una|de|del|tu|te)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGreetingOnlyInput(answer: string) {
  const text = answer.trim();
  if (!text || text.length > 80) return false;
  if (emergencyPattern.test(text) || medicalBoundaryPattern.test(text) || clearOffTopicPattern.test(text) || healthPattern.test(text)) {
    return false;
  }

  const normalized = normalizeQuestionText(text);
  if (!normalized) return false;
  const hasGreetingOrAssistantName = greetingWordPattern.test(text) || assistantAddressPattern.test(text);
  if (!hasGreetingOrAssistantName) return false;

  const remainder = normalized
    .replace(/\b(hi|hello|hey|yo|hola|buenas|buenos|dias|tardes|noches|good|morning|afternoon|evening|gemini|atrium|atlas|assistant|ai|copilot|bot|doctor|doc|there|please|pls|thanks|thank)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return !remainder;
}

export function createInitialQuestionLedger(language: Language, question: string): QuestionLedgerEntry[] {
  return [
    {
      id: `question-chief-concern-0`,
      slot: "chief_concern",
      question,
      normalizedQuestion: normalizeQuestionText(question),
      askedAtTurn: 0,
      answered: false,
    },
  ];
}

export function markCurrentQuestionAnswered(caseGraph: CaseGraph, answer: string): CaseGraph {
  const currentSlot = caseGraph.currentQuestionSlot;
  if (!currentSlot || currentSlot === "scope_redirect" || currentSlot === "review") return caseGraph;

  const ledger = caseGraph.questionLedger ?? [];
  const index = findLastIndex(ledger, (entry) => entry.slot === currentSlot && !entry.answered);
  if (index < 0) return caseGraph;

  const nextLedger = ledger.map((entry, entryIndex) =>
    entryIndex === index
      ? {
          ...entry,
          answered: true,
          answeredAtTurn: (caseGraph.questionCount ?? 0) + 1,
          answerSummary: answer.slice(0, 120),
        }
      : entry,
  );

  return {
    ...caseGraph,
    questionLedger: nextLedger,
  };
}

export function addQuestionToLedger(
  caseGraph: CaseGraph,
  question: string,
  slot: IntakeQuestionSlot,
): CaseGraph {
  if (slot === "review" || slot === "scope_redirect") {
    return {
      ...caseGraph,
      currentQuestion: question,
      currentQuestionSlot: slot,
    };
  }

  const normalizedQuestion = normalizeQuestionText(question);
  const ledger = caseGraph.questionLedger ?? [];
  const alreadyPending = ledger.some(
    (entry) => !entry.answered && entry.slot === slot && (entry.normalizedQuestion === normalizedQuestion || slot === "chief_concern"),
  );

  return {
    ...caseGraph,
    currentQuestion: question,
    currentQuestionSlot: slot,
    questionLedger: alreadyPending
      ? ledger
      : [
          ...ledger,
          {
            id: `question-${slot}-${Date.now()}`,
            slot,
            question,
            normalizedQuestion,
            askedAtTurn: caseGraph.questionCount ?? 0,
            answered: false,
          },
        ],
  };
}

export function recordScopeEvent(caseGraph: CaseGraph, category: Exclude<IntakeScopeCategory, "in_scope" | "emergency" | "greeting">) {
  const scopeState = caseGraph.scopeState ?? { offTopicCount: 0, boundaryCount: 0 };
  return {
    ...caseGraph,
    scopeState: {
      offTopicCount: scopeState.offTopicCount + (category === "off_topic" ? 1 : 0),
      boundaryCount: scopeState.boundaryCount + (category === "medical_boundary" ? 1 : 0),
      lastCategory: category,
    },
  };
}

export function shouldStopForScope(caseGraph: CaseGraph, category: Exclude<IntakeScopeCategory, "in_scope" | "emergency" | "greeting">) {
  const state = caseGraph.scopeState ?? { offTopicCount: 0, boundaryCount: 0 };
  const count = category === "off_topic" ? state.offTopicCount : state.boundaryCount;
  return count >= OFF_TOPIC_STOP_LIMIT;
}

export function chooseNextQuestionSlot(caseGraph: CaseGraph, latestAnswer = ""): IntakeQuestionSlot {
  const questionCount = caseGraph.questionCount ?? 0;
  const safetyLevel = highestSafetyLevel(detectRedFlags(caseGraph, latestAnswer));
  const basicsKnown = hasBodyLocation(caseGraph) && hasSeverity(caseGraph) && hasTimeline(caseGraph);
  const minimumMet = questionCount >= MIN_QUESTION_LIMIT;

  if (safetyLevel !== "none" && !slotDone(caseGraph, "red_flags")) return "red_flags";
  if (questionCount >= HARD_QUESTION_LIMIT) return "review";
  if (!minimumMet) {
    return chooseMinimumFollowUpSlot(caseGraph);
  }
  if (questionCount >= SOFT_QUESTION_LIMIT && basicsKnown) return "review";
  if (!hasBodyLocation(caseGraph) && !slotDone(caseGraph, "body_location")) return "body_location";
  if (caseGraph.bodyFindings.length && !hasBodyPrecision(caseGraph) && !slotDone(caseGraph, "body_precision")) {
    return "body_precision";
  }
  if (caseGraph.bodyFindings.length && !hasQuality(caseGraph) && !slotDone(caseGraph, "quality")) return "quality";
  if (!hasSeverity(caseGraph) && !slotDone(caseGraph, "severity")) return "severity";
  if (!hasTimeline(caseGraph) && !slotDone(caseGraph, "timeline")) return "timeline";
  if (!slotDone(caseGraph, "red_flags")) return "red_flags";
  if (!hasMedicalHistory(caseGraph) && !slotDone(caseGraph, "medical_history")) return "medical_history";
  if (!hasMedicationContext(caseGraph) && !slotDone(caseGraph, "medications_allergies")) {
    return "medications_allergies";
  }
  return "review";
}

export function questionSpecForSlot(
  slot: IntakeQuestionSlot,
  language: Language,
  context: { answer?: string; bodyContext?: string; facts?: Array<{ label: string; value: string }> } = {},
): SlotQuestionSpec {
  const answer = context.answer?.trim();
  const bodyContext = context.bodyContext?.trim();
  const baseFacts = [
    ...(context.facts ?? []),
    ...(answer ? [{ label: language === "en" ? "Latest answer" : "Última respuesta", value: answer.slice(0, 120) }] : []),
    ...(bodyContext ? [{ label: language === "en" ? "Body context" : "Contexto corporal", value: bodyContext.slice(0, 120) }] : []),
  ].slice(0, 4);

  const specs: Record<Language, Record<IntakeQuestionSlot, SlotQuestionSpec>> = {
    en: {
      chief_concern: makeSpec("chief_concern", "body_locator", "Intake", "Start with your main concern.", "What brings you in today?", ["Pain", "Breathing", "Digestive issue", "Not sure"]),
      body_location: makeSpec("body_location", "body_locator", "Map the area", "Location helps keep the check grounded.", "Where do you feel it most?", ["Head or neck", "Chest", "Abdomen", "Back or limbs"]),
      body_precision: makeSpec("body_precision", "body_locator", "Where exactly?", "This is optional precision.", "Where exactly is it? You can keep the whole area if you are not sure.", ["Upper area", "Lower area", "Left side", "Right side"]),
      quality: makeSpec("quality", "body_locator", "Describe the feeling", "One simple descriptor is enough.", "What does it feel like?", ["Pressure", "Sharp pain", "Burning", "Numbness"]),
      severity: makeSpec("severity", "severity_scale", "Rate intensity", "A rough intensity helps triage the review.", "How strong is it right now?", ["Mild", "Moderate", "Severe", "Worst yet"]),
      timeline: makeSpec("timeline", "timeline", "Map the timing", "Timing helps avoid repeated questions.", "When did it start, and how is it changing?", ["Started today", "A few days", "Getting worse", "Comes and goes"]),
      red_flags: makeSpec("red_flags", "red_flags", "Check warning signs", "Safety questions stay deterministic and short.", "Any warning signs with this?", ["Trouble breathing", "Fainting/weakness", "Heavy bleeding", "Severe allergic reaction"]),
      medical_history: makeSpec("medical_history", "medication_history", "Relevant history", "Only include context that could matter for this check.", "Any relevant medical history, pregnancy/postpartum status, or recent surgery?", ["Chronic condition", "Recent surgery", "Pregnancy/postpartum", "Recent hospital visit"]),
      medications_allergies: makeSpec("medications_allergies", "medication_history", "Medicines and allergies", "Medication context can change the safest next step.", "Any current medicines, new medicines, blood thinners, or allergies?", ["Current medicine", "New medicine", "Blood thinner", "Allergy"]),
      review: makeSpec("review", "scope_redirect", "Review ready", "The check has enough information for a non-diagnostic review.", "Ready for a non-diagnostic review.", ["Final review", "Add body area", "Add timing", "I'm not sure"]),
      scope_redirect: makeSpec("scope_redirect", "scope_redirect", "Stay on track", "This health check only collects symptom and visit-prep information.", "Let's keep this focused on your health check.", ["Describe symptoms", "Use body map", "Final review", "Dashboard"]),
    },
    es: {
      chief_concern: makeSpec("chief_concern", "body_locator", "Inicio", "Empieza con tu preocupación principal.", "¿Qué te trae hoy?", ["Dolor", "Respiración", "Digestivo", "No sé"]),
      body_location: makeSpec("body_location", "body_locator", "Ubica el área", "La ubicación mantiene el chequeo enfocado.", "¿Dónde lo sientes más?", ["Cabeza o cuello", "Pecho", "Abdomen", "Espalda o extremidades"]),
      body_precision: makeSpec("body_precision", "body_locator", "¿Dónde exactamente?", "Esta precisión es opcional.", "¿Dónde exactamente es? Puedes dejar el área completa si no estás seguro.", ["Parte superior", "Parte inferior", "Lado izquierdo", "Lado derecho"]),
      quality: makeSpec("quality", "body_locator", "Describe la sensación", "Un descriptor simple es suficiente.", "¿Cómo se siente?", ["Presión", "Punzante", "Ardor", "Entumecimiento"]),
      severity: makeSpec("severity", "severity_scale", "Mide intensidad", "Una intensidad aproximada ayuda a orientar la revisión.", "¿Qué tan fuerte es ahora?", ["Leve", "Moderado", "Severo", "Lo peor"]),
      timeline: makeSpec("timeline", "timeline", "Ubica el tiempo", "El tiempo evita preguntas repetidas.", "¿Cuándo empezó y cómo está cambiando?", ["Empezó hoy", "Hace días", "Empeora", "Va y viene"]),
      red_flags: makeSpec("red_flags", "red_flags", "Señales de alarma", "Las preguntas de seguridad deben ser cortas.", "¿Hay alguna señal de alarma con esto?", ["Falta de aire", "Desmayo/debilidad", "Sangrado fuerte", "Alergia severa"]),
      medical_history: makeSpec("medical_history", "medication_history", "Historia relevante", "Incluye solo contexto que pueda importar.", "¿Hay historia médica relevante, embarazo/posparto o cirugía reciente?", ["Condición crónica", "Cirugía reciente", "Embarazo/posparto", "Visita reciente"]),
      medications_allergies: makeSpec("medications_allergies", "medication_history", "Medicinas y alergias", "Este contexto puede cambiar el siguiente paso seguro.", "¿Tomas medicinas, medicina nueva, anticoagulantes o tienes alergias?", ["Medicina actual", "Medicina nueva", "Anticoagulante", "Alergia"]),
      review: makeSpec("review", "scope_redirect", "Revisión lista", "El chequeo tiene suficiente para una revisión no diagnóstica.", "Listo para una revisión no diagnóstica.", ["Revisión final", "Agregar área", "Agregar tiempo", "No sé"]),
      scope_redirect: makeSpec("scope_redirect", "scope_redirect", "Mantener enfoque", "Este chequeo solo recopila síntomas y preparación para consulta.", "Mantengamos esto enfocado en tu chequeo de salud.", ["Describir síntomas", "Usar mapa corporal", "Revisión final", "Dashboard"]),
    },
  };

  const spec = specs[language][slot];
  return {
    ...spec,
    ui: {
      ...spec.ui,
      facts: baseFacts,
      summary: bodyContext || answer ? spec.ui.summary : spec.ui.summary,
    },
  };
}

export function greetingRepromptSpec(language: Language): SlotQuestionSpec {
  const copy = {
    en: {
      title: "Start the check",
      message: "Hi. I can help organize what you are feeling for a non-diagnostic review.",
      question: "What brings you in today?",
      choices: ["Pain", "Breathing", "Digestive issue", "Not sure"],
    },
    es: {
      title: "Iniciar chequeo",
      message: "Hola. Puedo ayudarte a organizar lo que sientes para una revision no diagnostica.",
      question: "¿Qué te trae hoy?",
      choices: ["Dolor", "Respiración", "Digestivo", "No sé"],
    },
  }[language];

  return {
    assistantMessage: copy.message,
    nextQuestion: copy.question,
    questionSlot: "chief_concern",
    scopeCategory: "greeting",
    ui: {
      type: "body_locator",
      title: copy.title,
      summary: language === "en" ? "Share a symptom or choose a body area." : "Comparte un sintoma o elige un area del cuerpo.",
      priority: "routine",
      facts: [],
      choices: copy.choices,
      actions: ["Continue"],
    },
  };
}

export function scopeRedirectSpec(
  category: Exclude<IntakeScopeCategory, "in_scope" | "emergency" | "greeting">,
  language: Language,
  stop: boolean,
): SlotQuestionSpec {
  const isBoundary = category === "medical_boundary";
  const copy = {
    en: {
      title: isBoundary ? "Safety boundary" : "Stay on track",
      message: isBoundary
        ? "I cannot diagnose, prescribe, or tell you exactly what you have. I can help organize symptoms for a safer review."
        : "I can only help with this health check here. Share symptoms, use the body map, or finish the review.",
      question: stop
        ? "Choose how you want to continue this check."
        : isBoundary
          ? "What symptom or body area should we focus on instead?"
          : "What health detail should we focus on?",
      choices: stop
        ? ["Continue check", "Use body map", "Final review", "Dashboard"]
        : isBoundary
          ? ["Share symptoms", "Use body map", "Final review", "I'm not sure"]
          : ["Describe symptoms", "Use body map", "Final review", "I'm not sure"],
    },
    es: {
      title: isBoundary ? "Límite de seguridad" : "Mantener enfoque",
      message: isBoundary
        ? "No puedo diagnosticar, recetar ni decirte exactamente qué tienes. Sí puedo organizar síntomas para una revisión más segura."
        : "Aquí solo puedo ayudar con este chequeo de salud. Comparte síntomas, usa el mapa corporal o termina la revisión.",
      question: stop
        ? "Elige cómo quieres continuar este chequeo."
        : isBoundary
          ? "¿En qué síntoma o área del cuerpo nos enfocamos?"
          : "¿En qué detalle de salud nos enfocamos?",
      choices: stop
        ? ["Continuar chequeo", "Usar mapa corporal", "Revisión final", "Dashboard"]
        : isBoundary
          ? ["Compartir síntomas", "Usar mapa corporal", "Revisión final", "No sé"]
          : ["Describir síntomas", "Usar mapa corporal", "Revisión final", "No sé"],
    },
  }[language];

  return {
    assistantMessage: copy.message,
    nextQuestion: copy.question,
    questionSlot: "scope_redirect",
    scopeCategory: category,
    ui: {
      type: "scope_redirect",
      title: copy.title,
      summary: copy.message,
      priority: isBoundary ? "watch" : "routine",
      facts: [],
      choices: copy.choices,
      actions: ["Redirect"],
    },
  };
}

export function uiTypeForSlot(slot: IntakeQuestionSlot): IntakeUiKind {
  if (slot === "severity") return "severity_scale";
  if (slot === "timeline") return "timeline";
  if (slot === "red_flags") return "red_flags";
  if (slot === "medical_history" || slot === "medications_allergies") return "medication_history";
  if (slot === "review" || slot === "scope_redirect") return "scope_redirect";
  return "body_locator";
}

export function slotForUiType(type: IntakeUiKind): IntakeQuestionSlot {
  if (type === "severity_scale") return "severity";
  if (type === "timeline") return "timeline";
  if (type === "red_flags") return "red_flags";
  if (type === "medication_history") return "medical_history";
  if (type === "scope_redirect") return "scope_redirect";
  return "quality";
}

export function questionRepeatsLedger(
  question: string,
  ledger: QuestionLedgerEntry[] = [],
  slot?: IntakeQuestionSlot,
) {
  const normalized = normalizeQuestionText(question);
  if (!normalized) return false;

  return ledger.some((entry) => {
    if (slot && entry.slot !== slot) return false;
    if (entry.normalizedQuestion === normalized) return true;
    return similarity(entry.normalizedQuestion, normalized) >= 0.72;
  });
}

function makeSpec(
  questionSlot: IntakeQuestionSlot,
  type: IntakeUiKind,
  title: string,
  summary: string,
  nextQuestion: string,
  choices: string[],
): SlotQuestionSpec {
  return {
    assistantMessage: summary,
    nextQuestion,
    questionSlot,
    ui: {
      type,
      title,
      summary,
      priority: type === "red_flags" ? "watch" : "routine",
      facts: [],
      choices,
      actions: ["Continue"],
    },
  };
}

function slotDone(caseGraph: CaseGraph, slot: IntakeQuestionSlot) {
  return (caseGraph.questionLedger ?? []).some((entry) => entry.slot === slot && entry.answered);
}

function chooseMinimumFollowUpSlot(caseGraph: CaseGraph): IntakeQuestionSlot {
  if (!hasBodyLocation(caseGraph) && !slotDone(caseGraph, "body_location")) return "body_location";
  if (!hasSeverity(caseGraph) && !slotDone(caseGraph, "severity")) return "severity";
  if (!hasTimeline(caseGraph) && !slotDone(caseGraph, "timeline")) return "timeline";
  if (!slotDone(caseGraph, "red_flags")) return "red_flags";
  if (!hasMedicalHistory(caseGraph) && !slotDone(caseGraph, "medical_history")) return "medical_history";
  if (!hasMedicationContext(caseGraph) && !slotDone(caseGraph, "medications_allergies")) {
    return "medications_allergies";
  }
  return "red_flags";
}

function hasBodyLocation(caseGraph: CaseGraph) {
  return Boolean(caseGraph.bodyFindings.length || caseGraph.bodyRegions.length);
}

function hasBodyPrecision(caseGraph: CaseGraph) {
  return caseGraph.bodyFindings.some((finding) => Boolean(finding.subregion));
}

function hasQuality(caseGraph: CaseGraph) {
  return caseGraph.bodyFindings.some((finding) => Boolean(finding.quality && finding.quality !== "unknown"));
}

function hasSeverity(caseGraph: CaseGraph) {
  const narrative = [caseGraph.userNarrative, caseGraph.chiefConcern].join(" ");
  return (
    caseGraph.bodyFindings.some((finding) => typeof finding.severity === "number") ||
    caseGraph.symptoms.some((symptom) => typeof symptom.severity === "number") ||
    /\b(10|[1-9])\s*(\/\s*10|out of 10|de 10)?\b|mild|moderate|severe|leve|moderado|severo|fuerte/i.test(narrative)
  );
}

function hasTimeline(caseGraph: CaseGraph) {
  const narrative = [caseGraph.userNarrative, caseGraph.chiefConcern, ...caseGraph.timeline.map((event) => event.label)].join(" ");
  return /\b(since|started|began|today|yesterday|hours?|days?|weeks?|getting worse|comes and goes|constant|desde|empez|inicio|hoy|ayer|horas?|d[ií]as?|semanas?|empeora|va y viene|constante)\b/i.test(narrative);
}

function hasMedicalHistory(caseGraph: CaseGraph) {
  return Boolean(caseGraph.medicalHistory.length);
}

function hasMedicationContext(caseGraph: CaseGraph) {
  return Boolean(caseGraph.medications.length || caseGraph.allergies.length);
}

function similarity(left: string, right: string) {
  const leftParts = new Set(left.split(" ").filter(Boolean));
  const rightParts = new Set(right.split(" ").filter(Boolean));
  if (!leftParts.size || !rightParts.size) return 0;
  const shared = [...leftParts].filter((part) => rightParts.has(part)).length;
  const total = new Set([...leftParts, ...rightParts]).size;
  return shared / total;
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index;
  }
  return -1;
}

function looksLikeOpeningIntakeQuestion(question?: string) {
  if (!question) return false;
  const normalized = normalizeQuestionText(question);
  return (
    normalized.includes("brings today") ||
    normalized.includes("brings in today") ||
    normalized.includes("bring today") ||
    normalized.includes("most concerned about today") ||
    normalized.includes("main concern") ||
    normalized.includes("preocupa hoy") ||
    normalized.includes("trae hoy")
  );
}
