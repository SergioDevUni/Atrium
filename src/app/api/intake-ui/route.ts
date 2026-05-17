import { NextResponse } from "next/server";
import { getConfiguredAiProvider, logAiProviderSelection, requestAiJson } from "@/lib/ai-provider";
import {
  HARD_QUESTION_LIMIT,
  MIN_QUESTION_LIMIT,
  chooseNextQuestionSlot,
  classifyIntakeScope,
  greetingRepromptSpec,
  normalizeQuestionText,
  questionRepeatsLedger,
  questionSpecForSlot,
  scopeRedirectSpec,
  uiTypeForSlot,
} from "@/lib/intake-guardrails";
import type { CaseGraph, IntakeQuestionSlot, IntakeScopeCategory, IntakeUiKind } from "@/lib/types";

type IntakeUiPayload = {
  language?: "en" | "es";
  latestAnswer?: string;
  userNarrative?: string;
  currentQuestion?: string;
  questionCount?: number;
  allowedChoices?: string[];
  bodyFindings?: unknown;
  bodyFindingsContext?: string;
  caseGraph?: unknown;
};

type IntakeUiResult = {
  source: "google" | "openrouter" | "fallback";
  assistantMessage: string;
  nextQuestion: string;
  questionSlot?: IntakeQuestionSlot;
  scopeCategory?: IntakeScopeCategory;
  completionReason?: string;
  isComplete: boolean;
  ui: {
    type: IntakeUiKind;
    title: string;
    summary: string;
    priority: "routine" | "watch" | "urgent";
    facts: Array<{ label: string; value: string }>;
    choices: string[];
    actions: string[];
  };
  assessment?: {
    condition: string;
    confidence: number;
    rationale: string;
    nextSteps: Array<{ title: string; description: string; cta: string }>;
    correlations: Array<{ label: string; match: "High Match" | "Moderate Match" | "Low Match"; score: number }>;
    careInstructions: string[];
    urgentCare: string[];
  };
};

export async function POST(request: Request) {
  const payload = (await request.json()) as IntakeUiPayload;
  const language = payload.language ?? "en";
  const caseGraph = caseGraphFromPayload(payload, language);
  const scope = classifyIntakeScope(payload.latestAnswer ?? "", {
    language,
    currentQuestion: payload.currentQuestion,
    questionCount: payload.questionCount,
    allowedChoices: payload.allowedChoices,
  });
  const provider = getConfiguredAiProvider();
  logAiProviderSelection("intake-ui");

  if (scope.category === "greeting") {
    return NextResponse.json(greetingUi(language));
  }

  if (scope.category === "off_topic" || scope.category === "medical_boundary") {
    const state = caseGraph.scopeState ?? { offTopicCount: 0, boundaryCount: 0 };
    const count = scope.category === "off_topic" ? state.offTopicCount : state.boundaryCount;
    return NextResponse.json(scopeUi(scope.category, language, count >= 2));
  }

  const nextSlot = chooseNextQuestionSlot(caseGraph, payload.latestAnswer ?? "");
  if (nextSlot === "review" || (payload.questionCount ?? 0) >= HARD_QUESTION_LIMIT) {
    return NextResponse.json(reviewReadyUi(payload, language, "question-limit-or-complete"));
  }

  const fallback = fallbackUi(payload, language, "fallback", nextSlot);

  if (provider.name === "fallback") {
    return NextResponse.json(fallback);
  }

  try {
    const aiResponse = await requestAiJson({
      prompt: buildPrompt(payload, language, nextSlot, caseGraph),
      temperature: 0.22,
    });
    const parsed = normalizeUi(parseJson(aiResponse?.text), aiResponse?.provider ?? provider.name, nextSlot, fallback);
    if (!parsed || questionRepeatsLedger(parsed.nextQuestion, caseGraph.questionLedger, nextSlot)) {
      return NextResponse.json(fallback);
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(fallback);
  }
}

function buildPrompt(payload: IntakeUiPayload, language: "en" | "es", nextSlot: IntakeQuestionSlot, caseGraph: CaseGraph) {
  const outputLanguage = language === "en" ? "English" : "Spanish";
  const slotSpec = questionSpecForSlot(nextSlot, language, {
    answer: payload.latestAnswer,
    bodyContext: payload.bodyFindingsContext,
  });
  const answeredSlots = (caseGraph.questionLedger ?? [])
    .filter((entry) => entry.answered)
    .map((entry) => `${entry.slot}: ${entry.normalizedQuestion}`)
    .join("\n");
  return `You are Atrium's intake guidance service.

You are given the patient's latest intake answer and current case graph. Decide the next patient-facing question and response options.
The case graph may include bodyFindings and bodyFindingsContext. Treat those as user-reported symptom-location context, not diagnostic findings.

The application has already selected the only useful next information slot:
${nextSlot}

Ask only for that slot. Do not ask for any answered slot or repeat any previous question.
If the selected slot feels already answered, still return a short question for ${nextSlot}; the application will decide whether to finish.

Default question if you cannot improve it:
${slotSpec.nextQuestion}

Already answered or recently asked questions:
${answeredSlots || "none"}

Return strict JSON only with this shape:
{
  "source": "google | openrouter",
  "assistantMessage": "short response to the user",
  "nextQuestion": "one focused question that references the user's answer",
  "questionSlot": "${nextSlot}",
  "isComplete": false,
  "ui": {
    "type": "${uiTypeForSlot(nextSlot)}",
    "title": "UI title",
    "summary": "why this UI appears",
    "priority": "routine" | "watch" | "urgent",
    "facts": [{"label":"...", "value":"..."}],
    "choices": ["exactly 4 short multiple-choice answers; the UI will always add Other as option 5 and None / No as option 6"],
    "actions": ["short next-step labels"]
  },
  "assessment": {
    "condition": "most probable condition name, only when isComplete is true",
    "confidence": 0,
    "rationale": "brief reason",
    "nextSteps": [{"title":"...", "description":"...", "cta":"..."}],
    "correlations": [{"label":"...", "match":"High Match" | "Moderate Match" | "Low Match", "score": 0}],
    "careInstructions": ["..."],
    "urgentCare": ["..."]
  }
}

Routing guidelines:
- If the answer mentions a location or body part, prefer body_locator.
- If bodyFindingsContext includes a selected or inferred body area, use it to make the next question more specific.
- If it includes pain/intensity or vague severity, prefer severity_scale.
- If timing/onset/change is unclear, prefer timeline.
- If it mentions chest pain, breathing trouble, fainting, neurologic symptoms, heavy bleeding, allergic reaction, severe headache/neck stiffness, or rapidly worsening symptoms, prefer red_flags.
- If it mentions medicines, allergies, chronic conditions, pregnancy/postpartum, surgery, or asks about history, prefer medication_history.
- If there is enough information to provide a primary assessment, set isComplete true and include assessment.
- The first answer should decide the next UI and question.
- Ask at least ${MIN_QUESTION_LIMIT} intake questions before normal final review unless deterministic emergency safety is already active.
- Ask at most ${HARD_QUESTION_LIMIT} total questions. If questionCount is ${HARD_QUESTION_LIMIT} or higher, set isComplete true.
- Never ask the same question twice. Never ask for a slot listed in the answered ledger.
- The next question must collect: ${nextSlot}.
- Never ask if the user wants to save a summary, start a new check, review a summary, or prepare a review.
- Do not use summary_review during active intake.
- Every active-intake question must include exactly 4 multiple-choice choices. Do not include "Other", "None", or "No"; the UI adds Other as option 5 with a detail field and None / No as option 6.
- Do not ask for another open text answer after the first answer, except the UI-provided Other detail field.
- Assessment is not a definitive diagnosis; frame it as the most probable condition based on reported symptoms.
- Never describe body findings as clinical findings, detected disease, confirmed diagnosis, or proof of a condition.
- Language: ${outputLanguage}.

Current context:
${JSON.stringify(payload, null, 2)}`;
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}

function normalizeUi(
  value: unknown,
  source: "google" | "openrouter",
  nextSlot: IntakeQuestionSlot,
  fallback: IntakeUiResult,
): IntakeUiResult | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const ui = record.ui as Record<string, unknown> | undefined;
  if (!ui || typeof ui !== "object") return undefined;

  const expectedType = uiTypeForSlot(nextSlot);
  const type = typeof ui.type === "string" && isUiType(ui.type) ? ui.type : expectedType;
  const priority =
    ui.priority === "urgent" || ui.priority === "watch" || ui.priority === "routine" ? ui.priority : "routine";
  const choices = normalizeStrings(ui.choices).filter((choice) => {
    const normalized = choice.toLowerCase();
    return ![
      "other",
      "something else...",
      "none / no",
      "none",
      "no",
      "none of these",
      "none known",
      "not applicable",
      "nada de esto",
      "nada conocido",
      "no aplica",
    ].includes(normalized);
  });
  const nextQuestion =
    typeof record.nextQuestion === "string" && normalizeQuestionText(record.nextQuestion)
      ? record.nextQuestion
      : fallback.nextQuestion;

  return {
    source,
    assistantMessage: typeof record.assistantMessage === "string" ? record.assistantMessage : "I built the next check view.",
    nextQuestion,
    questionSlot: nextSlot,
    isComplete: record.isComplete === true,
    ui: {
      type: type === expectedType ? type : expectedType,
      title: typeof ui.title === "string" ? ui.title : titleFor(expectedType),
      summary: typeof ui.summary === "string" ? ui.summary : "Selected from the information shared so far.",
      priority,
      facts: normalizePairs(ui.facts),
      choices: choices.length >= 4 ? choices.slice(0, 4) : fallback.ui.choices,
      actions: normalizeStrings(ui.actions),
    },
    assessment: normalizeAssessment(record.assessment),
  };
}

function normalizeAssessment(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.condition !== "string" || !record.condition.trim()) return undefined;
  return {
    condition: record.condition,
    confidence: clampScore(record.confidence),
    rationale: typeof record.rationale === "string" ? record.rationale : "Based on the reported pattern.",
    nextSteps: normalizeNextSteps(record.nextSteps),
    correlations: normalizeCorrelations(record.correlations),
    careInstructions: normalizeStrings(record.careInstructions),
    urgentCare: normalizeStrings(record.urgentCare),
  };
}

function normalizeNextSteps(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return undefined;
      const record = item as Record<string, unknown>;
      if (typeof record.title !== "string" || typeof record.description !== "string") return undefined;
      return {
        title: record.title,
        description: record.description,
        cta: typeof record.cta === "string" ? record.cta : "Open",
      };
    })
    .filter((item): item is { title: string; description: string; cta: string } => Boolean(item))
    .slice(0, 3);
}

function normalizeCorrelations(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return undefined;
      const record = item as Record<string, unknown>;
      if (typeof record.label !== "string") return undefined;
      return {
        label: record.label,
        match:
          record.match === "High Match" || record.match === "Moderate Match" || record.match === "Low Match"
            ? (record.match as "High Match" | "Moderate Match" | "Low Match")
            : "Moderate Match",
        score: clampScore(record.score),
      };
    })
    .filter(
      (item): item is { label: string; match: "High Match" | "Moderate Match" | "Low Match"; score: number } =>
        Boolean(item),
    )
    .slice(0, 5);
}

function clampScore(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 70;
  const percent = number > 0 && number <= 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function normalizePairs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return undefined;
      const record = item as Record<string, unknown>;
      if (typeof record.label !== "string" || typeof record.value !== "string") return undefined;
      return { label: record.label, value: record.value };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item))
    .slice(0, 6);
}

function normalizeStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 4);
}

function isUiType(value: string): value is IntakeUiKind {
  return ["body_locator", "severity_scale", "timeline", "red_flags", "medication_history", "scope_redirect"].includes(value);
}

function titleFor(type: IntakeUiKind) {
  const titles: Record<IntakeUiKind, string> = {
    body_locator: "Pinpoint the location",
    severity_scale: "Rate the intensity",
    timeline: "Map the timing",
    red_flags: "Check warning signs",
    medication_history: "Add clinical context",
    scope_redirect: "Stay on track",
  };
  return titles[type];
}

function fallbackUi(
  payload: IntakeUiPayload,
  language: "en" | "es",
  source: "fallback",
  nextSlot = chooseNextQuestionSlot(caseGraphFromPayload(payload, language), payload.latestAnswer ?? ""),
): IntakeUiResult {
  if (nextSlot === "review" || (payload.questionCount ?? 0) >= HARD_QUESTION_LIMIT) {
    return reviewReadyUi(payload, language, "question-limit-or-complete");
  }
  const spec = questionSpecForSlot(nextSlot, language, {
    answer: payload.latestAnswer,
    bodyContext: payload.bodyFindingsContext,
  });
  return {
    source,
    assistantMessage: spec.assistantMessage,
    nextQuestion: spec.nextQuestion,
    questionSlot: nextSlot,
    isComplete: false,
    ui: spec.ui,
  };
}

function scopeUi(
  category: Exclude<IntakeScopeCategory, "in_scope" | "emergency" | "greeting">,
  language: "en" | "es",
  stop: boolean,
): IntakeUiResult {
  const spec = scopeRedirectSpec(category, language, stop);
  return {
    source: "fallback",
    assistantMessage: spec.assistantMessage,
    nextQuestion: spec.nextQuestion,
    questionSlot: "scope_redirect",
    scopeCategory: category,
    isComplete: false,
    ui: spec.ui,
  };
}

function greetingUi(language: "en" | "es"): IntakeUiResult {
  const spec = greetingRepromptSpec(language);
  return {
    source: "fallback",
    assistantMessage: spec.assistantMessage,
    nextQuestion: spec.nextQuestion,
    questionSlot: "chief_concern",
    scopeCategory: "greeting",
    isComplete: false,
    ui: spec.ui,
  };
}

function reviewReadyUi(payload: IntakeUiPayload, language: "en" | "es", completionReason: string): IntakeUiResult {
  const spec = questionSpecForSlot("review", language, {
    answer: payload.latestAnswer,
    bodyContext: payload.bodyFindingsContext,
  });
  return {
    source: "fallback",
    assistantMessage: spec.assistantMessage,
    nextQuestion: spec.nextQuestion,
    questionSlot: "review",
    completionReason,
    isComplete: true,
    ui: spec.ui,
    assessment: {
      condition: language === "en" ? "Primary review" : "Revisión principal",
      confidence: 64,
      rationale:
        language === "en"
          ? "The intake reached its useful question limit or has enough structured context."
          : "El chequeo llegó a su límite útil de preguntas o ya tiene suficiente contexto estructurado.",
      nextSteps: [],
      correlations: [],
      careInstructions: [],
      urgentCare: [],
    },
  };
}

function caseGraphFromPayload(payload: IntakeUiPayload, language: "en" | "es"): CaseGraph {
  const record =
    payload.caseGraph && typeof payload.caseGraph === "object" ? (payload.caseGraph as Partial<CaseGraph>) : {};
  return {
    mode: "demo",
    language,
    checkStatus: record.checkStatus ?? "active",
    questionCount: payload.questionCount ?? record.questionCount ?? 0,
    currentQuestion: payload.currentQuestion ?? record.currentQuestion,
    currentQuestionSlot: record.currentQuestionSlot,
    questionLedger: Array.isArray(record.questionLedger) ? record.questionLedger : [],
    scopeState: record.scopeState ?? { offTopicCount: 0, boundaryCount: 0 },
    scenarioId: record.scenarioId,
    scenarioTitle: record.scenarioTitle,
    chiefConcern: record.chiefConcern,
    userNarrative: payload.userNarrative ?? record.userNarrative ?? "",
    medicalHistory: Array.isArray(record.medicalHistory) ? record.medicalHistory : [],
    medications: Array.isArray(record.medications) ? record.medications : [],
    allergies: Array.isArray(record.allergies) ? record.allergies : [],
    bodyRegions: Array.isArray(record.bodyRegions) ? record.bodyRegions : [],
    bodyFindings: Array.isArray(record.bodyFindings) ? record.bodyFindings : [],
    symptoms: Array.isArray(record.symptoms) ? record.symptoms : [],
    timeline: Array.isArray(record.timeline) ? record.timeline : [],
    relevantPositives: Array.isArray(record.relevantPositives) ? record.relevantPositives : [],
    relevantNegatives: Array.isArray(record.relevantNegatives) ? record.relevantNegatives : [],
    missingInfo: Array.isArray(record.missingInfo) ? record.missingInfo : [],
    redFlags: Array.isArray(record.redFlags) ? record.redFlags : [],
    summaryDraft: record.summaryDraft,
    howAppHelps: record.howAppHelps,
    sources: record.sources,
  };
}
