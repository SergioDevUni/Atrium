import type { AssessmentResult, IntakeQuestionSlot, IntakeScopeCategory, IntakeUiKind } from "@/lib/types";

export type IntakeUiSpec = {
  type: IntakeUiKind;
  title: string;
  summary: string;
  priority: "routine" | "watch" | "urgent";
  facts: Array<{ label: string; value: string }>;
  choices: string[];
  actions: string[];
};

export type IntakeUiResult = {
  source: "google" | "openrouter" | "fallback";
  assistantMessage: string;
  nextQuestion: string;
  questionSlot?: IntakeQuestionSlot;
  scopeCategory?: IntakeScopeCategory;
  completionReason?: string;
  isComplete: boolean;
  ui: IntakeUiSpec;
  assessment?: AssessmentResult;
};

export type { AssessmentResult };
