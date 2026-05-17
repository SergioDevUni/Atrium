import { NextResponse } from "next/server";
import { getConfiguredAiProvider, logAiProviderSelection, requestAiJson } from "@/lib/ai-provider";

type AssessmentInput = {
  language?: "en" | "es";
  assessment?: {
    condition?: string;
    confidence?: number;
    rationale?: string;
    nextSteps?: Array<{ title: string; description: string; cta: string }>;
    correlations?: Array<{ label: string; match: string; score: number }>;
    careInstructions?: string[];
    urgentCare?: string[];
  };
  caseGraph?: unknown;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as AssessmentInput;
  const language = payload.language ?? "en";
  const fallback = fallbackAdvice(payload, language);
  const provider = getConfiguredAiProvider();
  logAiProviderSelection("patient-advice");

  if (provider.name === "fallback") {
    return NextResponse.json(fallback);
  }

  try {
    const aiResponse = await requestAiJson({
      prompt: buildPrompt(payload, language),
      temperature: 0.35,
    });
    const parsed = normalizeAdvice(parseJson(aiResponse?.text), aiResponse?.provider ?? provider.name);
    return NextResponse.json(parsed ?? fallback);
  } catch {
    return NextResponse.json(fallback);
  }
}

function buildPrompt(payload: AssessmentInput, language: "en" | "es") {
  const outputLanguage = language === "en" ? "English" : "Spanish";
  return `You are a patient communication agent. Another agent already analyzed the symptoms and produced a primary assessment.

Your job:
- Explain the assessment in a friendly, calm, non-alarming way.
- Do not overstate certainty.
- Do not tell the user to worry.
- Keep advice practical and easy to follow.
- Preserve urgent-care triggers, but phrase them clearly and calmly.
- Return strict JSON only.

Schema:
{
  "friendlyTitle": "short patient-friendly condition title",
  "patientMessage": "2-3 sentences in plain language",
  "reassurance": "one calm sentence that reduces unnecessary worry without dismissing symptoms",
  "confidenceLabel": "plain language confidence label",
  "gentleNextSteps": [{"title":"...", "description":"...", "cta":"..."}],
  "careInstructions": ["short friendly instruction"],
  "urgentCare": ["short urgent-care trigger"]
}

Language: ${outputLanguage}

Input:
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

function normalizeAdvice(value: unknown, source: "google" | "openrouter") {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    source,
    friendlyTitle: stringOr(record.friendlyTitle, "Primary assessment"),
    patientMessage: stringOr(record.patientMessage, "This pattern can fit the assessment shown here. Use the next steps to track changes and decide what to do next."),
    reassurance: stringOr(record.reassurance, "Most checks like this are about organizing information clearly, not creating alarm."),
    confidenceLabel: stringOr(record.confidenceLabel, "Likely match based on what you shared"),
    gentleNextSteps: normalizeSteps(record.gentleNextSteps),
    careInstructions: normalizeStrings(record.careInstructions),
    urgentCare: normalizeStrings(record.urgentCare),
  };
}

function fallbackAdvice(payload: AssessmentInput, language: "en" | "es") {
  const condition = payload.assessment?.condition || (language === "en" ? "Primary assessment" : "Evaluación principal");
  return {
    source: "fallback",
    friendlyTitle: condition,
    patientMessage:
      language === "en"
        ? `Your answers most closely fit ${condition}. This is a guide to help you understand the pattern and choose sensible next steps.`
        : `Tus respuestas se parecen más a ${condition}. Esta guía te ayuda a entender el patrón y elegir próximos pasos sensatos.`,
    reassurance:
      language === "en"
        ? "This is meant to be helpful and practical, not to make you worry."
        : "La intención es ayudarte de forma práctica, no alarmarte.",
    confidenceLabel: language === "en" ? "Best match from your answers" : "Mejor coincidencia según tus respuestas",
    gentleNextSteps: payload.assessment?.nextSteps ?? [],
    careInstructions: payload.assessment?.careInstructions ?? [],
    urgentCare: payload.assessment?.urgentCare ?? [],
  };
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeSteps(value: unknown) {
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

function normalizeStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 5);
}
