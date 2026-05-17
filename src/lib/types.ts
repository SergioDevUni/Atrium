export type Language = "en" | "es";

export type BodyRegion =
  | "head"
  | "chest"
  | "abdomen"
  | "back"
  | "leftArm"
  | "rightArm"
  | "leftHand"
  | "rightHand"
  | "leftLeg"
  | "rightLeg"
  | "leftFoot"
  | "rightFoot";

export type BodyFindingQuality =
  | "sharp"
  | "pressure"
  | "burning"
  | "cramping"
  | "numbness"
  | "other"
  | "unknown";

export type BodyFindingStatus = "draft" | "confirmed";

export type IntakeUiKind =
  | "body_locator"
  | "severity_scale"
  | "timeline"
  | "red_flags"
  | "medication_history"
  | "scope_redirect";

export type IntakeQuestionSlot =
  | "chief_concern"
  | "body_location"
  | "body_precision"
  | "quality"
  | "severity"
  | "timeline"
  | "red_flags"
  | "medical_history"
  | "medications_allergies"
  | "review"
  | "scope_redirect";

export type IntakeScopeCategory = "in_scope" | "greeting" | "off_topic" | "medical_boundary" | "emergency";

export type QuestionLedgerEntry = {
  id: string;
  slot: IntakeQuestionSlot;
  question: string;
  normalizedQuestion: string;
  askedAtTurn: number;
  answered: boolean;
  answeredAtTurn?: number;
  answerSummary?: string;
};

export type IntakeScopeState = {
  offTopicCount: number;
  boundaryCount: number;
  lastCategory?: IntakeScopeCategory;
};

export type AssessmentResult = {
  condition: string;
  confidence: number;
  rationale: string;
  friendlyTitle?: string;
  patientMessage?: string;
  reassurance?: string;
  confidenceLabel?: string;
  nextSteps: Array<{ title: string; description: string; cta: string }>;
  correlations: Array<{ label: string; match: "High Match" | "Moderate Match" | "Low Match"; score: number }>;
  careInstructions: string[];
  urgentCare: string[];
};

export type BodyFinding = {
  id: string;
  region: BodyRegion;
  subregion?: string;
  severity?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  quality?: BodyFindingQuality;
  notes?: string;
  source: "inferred" | "user-selected";
  status?: BodyFindingStatus;
  createdAt: string;
  updatedAt?: string;
};

export type Symptom = {
  id: string;
  region?: BodyRegion;
  label: string;
  severity?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  duration?: string;
  notes?: string;
};

export type TimelineEvent = {
  id: string;
  time: string;
  label: string;
};

export type RedFlag = {
  id: string;
  label: string;
  level: "urgent" | "emergency";
  matchedText?: string;
};

export type BodyRegionSelection = {
  region: BodyRegion;
  label: string;
  severity?: number;
};

export type CaseGraph = {
  mode: "demo";
  language: Language;
  checkStatus?: "idle" | "active" | "review-ready";
  questionCount?: number;
  currentQuestion?: string;
  currentQuestionSlot?: IntakeQuestionSlot;
  questionLedger?: QuestionLedgerEntry[];
  scopeState?: IntakeScopeState;
  scenarioId?: string;
  scenarioTitle?: string;
  chiefConcern?: string;
  userNarrative?: string;
  medicalHistory: string[];
  medications: string[];
  allergies: string[];
  bodyRegions: BodyRegionSelection[];
  bodyFindings: BodyFinding[];
  symptoms: Symptom[];
  timeline: TimelineEvent[];
  relevantPositives: string[];
  relevantNegatives: string[];
  missingInfo: string[];
  redFlags: RedFlag[];
  summaryDraft?: string;
  howAppHelps?: string[];
  sources?: Array<{
    label: string;
    url: string;
  }>;
};

export type CheckRecord = {
  id: string;
  schemaVersion?: number;
  status?: "saved" | "reviewed";
  createdAt: string;
  updatedAt?: string;
  language: Language;
  title: string;
  safetyLevel: "none" | "urgent" | "emergency";
  symptomCount: number;
  missingCount: number;
  bodyAreas: string[];
  importantSymptoms: string[];
  summary: string;
  snapshot: CaseGraph;
  assessment?: AssessmentResult;
};

export type CheckDraft = {
  id: "active-check";
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  language: Language;
  title: string;
  safetyLevel: "none" | "urgent" | "emergency";
  bodyAreas: string[];
  snapshot: CaseGraph;
  assessment?: AssessmentResult;
};
