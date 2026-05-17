import { regionLabels } from "./i18n";
import {
  HARD_QUESTION_LIMIT,
  MIN_QUESTION_LIMIT,
  SOFT_QUESTION_LIMIT,
  createInitialQuestionLedger,
  markCurrentQuestionAnswered,
  chooseNextQuestionSlot,
  isGreetingOnlyInput,
  questionSpecForSlot,
} from "./intake-guardrails";
import { detectRedFlags, highestSafetyLevel } from "./safety";
import type { BodyRegion, CaseGraph, Language, Symptom } from "./types";

type AgentResult = {
  caseGraph: CaseGraph;
  highlightedRegion?: BodyRegion;
};

const regionHints: Array<{ region: BodyRegion; pattern: RegExp }> = [
  { region: "head", pattern: /head|headache|migraine|vision|cabeza|migraña|visión/i },
  { region: "chest", pattern: /chest|breath|heart|pecho|respirar|aire|coraz[oó]n/i },
  { region: "abdomen", pattern: /stom(?:ach|atch|ache|ac)|tummy|abdomen|belly|vomit|diarrhea|est[oó]mago|barriga|panza|abdominal|v[oó]mito|diarrea/i },
  { region: "back", pattern: /back|spine|espalda|columna/i },
  { region: "leftHand", pattern: /left hand|left wrist|left finger|left palm|mano izquierda|muñeca izquierda|dedo izquierdo|palma izquierda/i },
  { region: "rightHand", pattern: /right hand|right wrist|right finger|right palm|mano derecha|muñeca derecha|dedo derecho|palma derecha/i },
  { region: "leftArm", pattern: /left arm|brazo izquierdo/i },
  { region: "rightArm", pattern: /right arm|brazo derecho/i },
  { region: "leftFoot", pattern: /left foot|left ankle|left toe|pie izquierdo|tobillo izquierdo|dedo del pie izquierdo/i },
  { region: "rightFoot", pattern: /right foot|right ankle|right toe|pie derecho|tobillo derecho|dedo del pie derecho/i },
  { region: "leftLeg", pattern: /left leg|pierna izquierda/i },
  { region: "rightLeg", pattern: /right leg|pierna derecha/i },
];

export function startAdaptiveCheck(language: Language): CaseGraph {
  const currentQuestion =
    language === "en"
      ? "What are you most concerned about today? Use one natural sentence."
      : "¿Qué es lo que más te preocupa hoy? Usa una frase natural.";

  return {
    mode: "demo",
    language,
    checkStatus: "active",
    questionCount: 0,
    currentQuestion,
    currentQuestionSlot: "chief_concern",
    questionLedger: createInitialQuestionLedger(language, currentQuestion),
    scopeState: { offTopicCount: 0, boundaryCount: 0 },
    scenarioTitle: language === "en" ? "New adaptive check" : "Nuevo chequeo adaptativo",
    chiefConcern: language === "en" ? "New adaptive check" : "Nuevo chequeo adaptativo",
    userNarrative: "",
    medicalHistory: [],
    medications: [],
    allergies: [],
    bodyRegions: [],
    bodyFindings: [],
    symptoms: [],
    timeline: [],
    relevantPositives: [],
    relevantNegatives: [],
    missingInfo:
      language === "en"
        ? ["Onset", "Severity", "Red flags", "Medical history", "Medications/allergies"]
        : ["Inicio", "Intensidad", "Señales de alarma", "Historia médica", "Medicamentos/alergias"],
    redFlags: [],
    howAppHelps:
      language === "en"
        ? [
            "Extracts facts from natural language instead of forcing a long form.",
            "Runs safety checks after every answer.",
            "Asks only the next question most likely to change the review.",
          ]
        : [
            "Extrae datos desde lenguaje natural sin forzar un formulario largo.",
            "Ejecuta seguridad después de cada respuesta.",
            "Hace solo la siguiente pregunta que más puede cambiar la revisión.",
          ],
  };
}

export function applyAdaptiveAnswer(caseGraph: CaseGraph, answer: string): AgentResult {
  if (isGreetingOnlyInput(answer)) {
    return { caseGraph };
  }

  const answeredGraph = markCurrentQuestionAnswered(caseGraph, answer);
  const language = answeredGraph.language;
  const region = inferRegion(answer) ?? answeredGraph.bodyRegions[0]?.region;
  const severity = inferSeverity(answer);
  const duration = inferDuration(answer);
  const newSymptom = buildSymptom(answer, language, region, severity, duration);
  const medicalHistory = mergeFacts(answeredGraph.medicalHistory, extractMedicalHistory(answer, language));
  const medications = mergeFacts(answeredGraph.medications, extractMedications(answer, language));
  const allergies = mergeFacts(answeredGraph.allergies, extractAllergies(answer, language));

  const nextBase: CaseGraph = {
    ...answeredGraph,
    checkStatus: "active",
    questionCount: (answeredGraph.questionCount ?? 0) + 1,
    chiefConcern:
      answeredGraph.userNarrative || (answeredGraph.questionCount ?? 0) === 0
        ? answer.slice(0, 120)
        : answeredGraph.chiefConcern,
    userNarrative: [answeredGraph.userNarrative, answer].filter(Boolean).join("\n"),
    medicalHistory,
    medications,
    allergies,
    bodyRegions: region
      ? mergeRegion(answeredGraph.bodyRegions, region, regionLabels[language][region], severity)
      : answeredGraph.bodyRegions,
    symptoms: newSymptom ? [...answeredGraph.symptoms, newSymptom] : answeredGraph.symptoms,
    timeline: [
      ...answeredGraph.timeline,
      {
        id: `adaptive-${Date.now()}`,
        time: language === "en" ? `Answer ${(answeredGraph.questionCount ?? 0) + 1}` : `Respuesta ${(answeredGraph.questionCount ?? 0) + 1}`,
        label: answer,
      },
    ],
    relevantPositives: mergeFacts(answeredGraph.relevantPositives, extractPositives(answer, language)),
    relevantNegatives: mergeFacts(answeredGraph.relevantNegatives, extractNegatives(answer, language)),
  };

  const redFlags = detectRedFlags(nextBase, answer);
  const missingInfo = computeMissingInfo(nextBase, language);
  const safetyLevel = highestSafetyLevel(redFlags);
  const nextWithSignals = { ...nextBase, redFlags, missingInfo };
  const nextSlot = chooseNextQuestionSlot(nextWithSignals, answer);
  const answeredCount = nextBase.questionCount ?? 0;
  const emergencyReady = safetyLevel === "emergency";
  const normalReady =
    answeredCount >= MIN_QUESTION_LIMIT &&
    (safetyLevel !== "none" ||
      missingInfo.length === 0 ||
      nextSlot === "review" ||
      answeredCount >= SOFT_QUESTION_LIMIT);
  const ready = emergencyReady || normalReady || answeredCount >= HARD_QUESTION_LIMIT;
  const nextQuestion = ready
    ? reviewReadyText(language, safetyLevel)
    : questionSpecForSlot(nextSlot, language, { answer }).nextQuestion;

  return {
    caseGraph: {
      ...nextBase,
      redFlags,
      missingInfo,
      checkStatus: ready ? "review-ready" : "active",
      currentQuestion: nextQuestion,
      currentQuestionSlot: ready ? "review" : nextSlot,
    },
    highlightedRegion: region,
  };
}

export function inferRegion(text: string): BodyRegion | undefined {
  return regionHints.find((hint) => hint.pattern.test(text))?.region;
}

export function inferSeverity(text: string): Symptom["severity"] | undefined {
  const numeric = text.match(/\b(10|[1-9])\s*(?:\/\s*10|out of 10|de 10)?\b/i)?.[1];
  if (numeric) return Number(numeric) as Symptom["severity"];
  if (/severe|worst|intense|very bad|severo|fuerte|intenso/i.test(text)) return 8;
  if (/moderate|medium|moderado/i.test(text)) return 5;
  if (/mild|little|leve|poco/i.test(text)) return 2;
  return undefined;
}

function inferDuration(text: string) {
  return text.match(/\b(?:since|for|desde|durante)\s+([^,.]+)/i)?.[0];
}

function buildSymptom(
  answer: string,
  language: Language,
  region?: BodyRegion,
  severity?: Symptom["severity"],
  duration?: string,
): Symptom | undefined {
  if (!region && !/pain|fever|breath|vomit|diarrhea|stom(?:ach|atch|ache|ac)|tummy|abdomen|belly|dolor|fiebre|aire|v[oó]mito|diarrea|est[oó]mago|barriga|panza/i.test(answer)) {
    return undefined;
  }

  return {
    id: `adaptive-symptom-${Date.now()}`,
    region,
    label: answer.slice(0, 90) || (language === "en" ? "Reported concern" : "Preocupación reportada"),
    severity,
    duration,
    notes: language === "en" ? "Extracted from adaptive answer." : "Extraído de respuesta adaptativa.",
  };
}

function extractMedicalHistory(text: string, language: Language) {
  if (!/history|diagnosed|surgery|pregnant|postpartum|diabetes|asthma|cancer|clot|antecedente|diagnostic|cirug|embaraz|posparto|diabetes|asma|c[aá]ncer|co[aá]gulo/i.test(text)) {
    return [];
  }
  return [language === "en" ? `Reported history: ${text.slice(0, 80)}` : `Historia reportada: ${text.slice(0, 80)}`];
}

function extractMedications(text: string, language: Language) {
  if (!/medication|medicine|pill|anticoagulant|insulin|metformin|ibuprofen|medicamento|pastilla|anticoagulante|insulina/i.test(text)) {
    return [];
  }
  return [language === "en" ? `Medication detail: ${text.slice(0, 80)}` : `Medicamento: ${text.slice(0, 80)}`];
}

function extractAllergies(text: string, language: Language) {
  if (!/allerg|alerg/i.test(text)) return [];
  return [language === "en" ? `Allergy detail: ${text.slice(0, 80)}` : `Alergia: ${text.slice(0, 80)}`];
}

function extractPositives(text: string, language: Language) {
  return [language === "en" ? `User reported: ${text.slice(0, 90)}` : `Usuario reportó: ${text.slice(0, 90)}`];
}

function extractNegatives(text: string, language: Language) {
  const negatives = text.match(/\b(no|not|without|sin)\s+[^,.]+/gi) ?? [];
  return negatives.map((item) => (language === "en" ? `Denied: ${item}` : `Niega: ${item}`));
}

function computeMissingInfo(caseGraph: CaseGraph, language: Language) {
  const missing: string[] = [];
  const narrative = [caseGraph.userNarrative, caseGraph.chiefConcern].join(" ");
  if (!/since|started|began|today|yesterday|desde|empez|inicio|hoy|ayer/i.test(narrative)) {
    missing.push(language === "en" ? "Onset/timing" : "Inicio/tiempo");
  }
  if (!caseGraph.symptoms.some((symptom) => symptom.severity)) {
    missing.push(language === "en" ? "Severity" : "Intensidad");
  }
  if (!caseGraph.bodyRegions.length) {
    missing.push(language === "en" ? "Body area" : "Área del cuerpo");
  }
  if (!caseGraph.medicalHistory.length) {
    missing.push(language === "en" ? "Relevant medical history" : "Historia médica relevante");
  }
  if (!caseGraph.medications.length && !caseGraph.allergies.length) {
    missing.push(language === "en" ? "Medications or allergies" : "Medicamentos o alergias");
  }
  if (!/fever|breath|chest|faint|blood|fiebre|aire|pecho|desmayo|sangre/i.test(narrative)) {
    missing.push(language === "en" ? "Red-flag symptoms" : "Señales de alarma");
  }
  return missing.slice(0, 5);
}

function chooseNextQuestion(caseGraph: CaseGraph, missing: string[], language: Language) {
  const first = missing[0];
  if (!first) return reviewReadyText(language, highestSafetyLevel(caseGraph.redFlags));
  const questions: Record<Language, Record<string, string>> = {
    en: {
      "Onset/timing": "When did this start, and is it getting better, worse, or staying the same?",
      Severity: "How severe is it from 1 to 10, and is that number changing?",
      "Body area": "Where exactly is it happening? You can click the body map too.",
      "Relevant medical history": "Any relevant history, recent surgery, pregnancy/postpartum status, or chronic condition?",
      "Medications or allergies": "Any current medications, blood thinners, new medicines, or allergies?",
      "Red-flag symptoms": "Any chest pain, trouble breathing, fainting, weakness on one side, severe allergy symptoms, blood, or pregnancy-related bleeding?",
    },
    es: {
      "Inicio/tiempo": "¿Cuándo empezó y está mejorando, empeorando o igual?",
      Intensidad: "¿Qué intensidad tiene del 1 al 10 y ese número está cambiando?",
      "Área del cuerpo": "¿Dónde exactamente ocurre? También puedes marcarlo en el mapa corporal.",
      "Historia médica relevante": "¿Hay antecedente relevante, cirugía reciente, embarazo/posparto o enfermedad crónica?",
      "Medicamentos o alergias": "¿Tomas medicamentos, anticoagulantes, medicinas nuevas o tienes alergias?",
      "Señales de alarma": "¿Hay dolor de pecho, falta de aire, desmayo, debilidad de un lado, alergia severa, sangre o sangrado en embarazo?",
    },
  };
  return questions[language][first] ?? first;
}

function reviewReadyText(language: Language, level: string) {
  if (level === "emergency") {
    return language === "en"
      ? "Emergency signal found. Stop the check and seek local emergency care now."
      : "Señal de emergencia detectada. Detén el chequeo y busca urgencias locales ahora.";
  }
  return language === "en"
    ? "I have enough for a non-diagnostic review. You can create the review now."
    : "Tengo suficiente para una revisión no diagnóstica. Puedes crear la revisión ahora.";
}

function mergeFacts(existing: string[], incoming: string[]) {
  return Array.from(new Set([...existing, ...incoming])).slice(0, 8);
}

function mergeRegion(
  existing: CaseGraph["bodyRegions"],
  region: BodyRegion,
  label: string,
  severity?: number,
) {
  if (existing.some((item) => item.region === region)) return existing;
  return [...existing, { region, label, severity }];
}
