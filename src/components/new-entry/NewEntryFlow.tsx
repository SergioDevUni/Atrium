"use client";

import {
  ChevronDown,
  Mic,
  MicOff,
  MousePointer2,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { applyAdaptiveAnswer, inferRegion, inferSeverity, startAdaptiveCheck } from "@/lib/agent-flow";
import {
  type BodyFindingUpdate,
  bodyFindingsToPromptContext,
  ensureDraftBodyFinding,
  formatBodyFinding,
  removeBodyFinding,
  updateBodyFinding,
} from "@/lib/body-findings";
import { getBodySubregionLabel, getBodySubregionOptions } from "@/lib/body-location-taxonomy";
import { regionLabels } from "@/lib/i18n";
import {
  addQuestionToLedger,
  chooseNextQuestionSlot,
  classifyIntakeScope,
  greetingRepromptSpec,
  HARD_QUESTION_LIMIT,
  questionSpecForSlot,
  recordScopeEvent,
  scopeRedirectSpec,
  shouldStopForScope,
} from "@/lib/intake-guardrails";
import { highestSafetyLevel } from "@/lib/safety";
import type {
  AssessmentResult,
  BodyFinding,
  BodyFindingQuality,
  BodyRegion,
  CaseGraph,
  IntakeQuestionSlot,
  Language,
} from "@/lib/types";
import { AssessmentPage } from "./AssessmentPage";
import { AtlasBodyAreaStrip } from "./AtlasBodyAreaStrip";
import { BodyInteractionModel, BodyRegionButtons } from "./BodyInteractionModel";
import type { IntakeUiResult } from "./types";

const OPEN_ANSWER = "Something else...";
const SMART_NONE_CHOICE = "__atlas_smart_none__";

const qualityOptions: Array<{ label: string; value: BodyFindingQuality }> = [
  { label: "Pressure", value: "pressure" },
  { label: "Sharp", value: "sharp" },
  { label: "Burning", value: "burning" },
  { label: "Cramping", value: "cramping" },
  { label: "Numbness", value: "numbness" },
  { label: "Not sure", value: "unknown" },
  { label: "Something else", value: "other" },
];

const severityValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type AtlasChoiceOption = {
  value: string;
  label: string;
  kind: "standard" | "open" | "none";
};

type NewEntryFlowProps = {
  language: Language;
  caseGraph: CaseGraph;
  setCaseGraph: Dispatch<SetStateAction<CaseGraph>>;
  initialAssessment: AssessmentResult | null;
  onAssessmentChange: (assessment: AssessmentResult | null, snapshot?: CaseGraph) => void;
  onCancel: () => void;
  onDashboard: () => void;
  onStartNewCheck: () => void;
  onSaveRecord: (caseGraph: CaseGraph, assessment?: AssessmentResult) => Promise<unknown> | unknown;
};

export function NewEntryFlow({
  language,
  caseGraph,
  setCaseGraph,
  initialAssessment,
  onAssessmentChange,
  onCancel,
  onDashboard,
  onStartNewCheck,
  onSaveRecord,
}: NewEntryFlowProps) {
  const [firstAnswer, setFirstAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [otherAnswer, setOtherAnswer] = useState("");
  const [previewRegion, setPreviewRegion] = useState<BodyRegion | null>(null);
  const [focusedRegion, setFocusedRegion] = useState<BodyRegion | null>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [currentUi, setCurrentUi] = useState<IntakeUiResult | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(initialAssessment);
  const [isRouting, setIsRouting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const labels = regionLabels[language];
  const safetyLevel = highestSafetyLevel(caseGraph.redFlags);
  const activeFinding = useMemo(
    () => (activeFindingId ? caseGraph.bodyFindings.find((finding) => finding.id === activeFindingId) ?? null : null),
    [activeFindingId, caseGraph.bodyFindings],
  );
  const copilotBodyContext = useMemo(
    () => bodyFindingsToPromptContext(caseGraph.bodyFindings, language),
    [caseGraph.bodyFindings, language],
  );

  useCopilotReadable(
    {
      description:
        "Atrium Body View intake state for guided question generation. Body findings are user-reported symptom-location context, not diagnostic findings.",
      value: {
        language,
        latestAnswer: firstAnswer,
        currentQuestion: currentUi?.nextQuestion ?? "What brings you in today?",
        questionCount: caseGraph.questionCount ?? 0,
        safetyLevel,
        bodyFindings: caseGraph.bodyFindings,
        bodyFindingsContext: copilotBodyContext,
      },
    },
    [
      language,
      firstAnswer,
      currentUi?.nextQuestion,
      caseGraph.questionCount,
      safetyLevel,
      caseGraph.bodyFindings,
      copilotBodyContext,
    ],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentUi?.ui.type, assessment]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAssessment(initialAssessment), 0);
    return () => window.clearTimeout(timer);
  }, [initialAssessment]);

  function updateAssessment(nextAssessment: AssessmentResult | null, snapshot = caseGraph) {
    setAssessment(nextAssessment);
    onAssessmentChange(nextAssessment, snapshot);
  }

  function applyAnswer(answer: string, sourceGraph = caseGraph) {
    const baseCase =
      sourceGraph.checkStatus === "idle" && !sourceGraph.scenarioId ? startAdaptiveCheck(language) : sourceGraph;
    const result = applyAdaptiveAnswer(baseCase, answer);
    const inferredRegion = result.highlightedRegion ?? inferRegion(answer);
    let nextGraph = result.caseGraph;

    if (inferredRegion) {
      const ensured = ensureDraftBodyFinding({
        caseGraph: nextGraph,
        region: inferredRegion,
        source: "inferred",
        severity: inferSeverity(answer) as BodyFinding["severity"] | undefined,
        language,
      });
      nextGraph = ensured.caseGraph;
      setActiveFindingId(ensured.finding.id);
      setPreviewRegion(inferredRegion);
      setFocusedRegion(inferredRegion);
    }

    setCaseGraph(nextGraph);
    return nextGraph;
  }

  function maybeRedirectOutOfScope(answer: string, sourceGraph = caseGraph) {
    const baseCase =
      sourceGraph.checkStatus === "idle" && !sourceGraph.scenarioId ? startAdaptiveCheck(language) : sourceGraph;
    const scope = classifyIntakeScope(answer, {
      language,
      currentQuestion: currentUi?.nextQuestion ?? baseCase.currentQuestion,
      questionCount: baseCase.questionCount ?? 0,
      allowedChoices: currentUi ? allowedChoiceLabelsForUi(currentUi, language) : undefined,
    });

    if (scope.category === "greeting") {
      const greeting = greetingRepromptSpec(language);
      setCaseGraph(baseCase);
      setCurrentUi({
        source: "fallback",
        assistantMessage: greeting.assistantMessage,
        nextQuestion: greeting.nextQuestion,
        questionSlot: "chief_concern",
        scopeCategory: "greeting",
        isComplete: false,
        ui: greeting.ui,
      });
      setFirstAnswer("");
      setSelectedChoice("");
      setOtherAnswer("");
      return true;
    }

    if (scope.category !== "off_topic" && scope.category !== "medical_boundary") return false;

    const scopedGraph = recordScopeEvent(baseCase, scope.category);
    const stop = shouldStopForScope(scopedGraph, scope.category);
    const redirect = scopeRedirectSpec(scope.category, language, stop);
    setCaseGraph(scopedGraph);
    setCurrentUi({
      source: "fallback",
      assistantMessage: redirect.assistantMessage,
      nextQuestion: redirect.nextQuestion,
      questionSlot: "scope_redirect",
      scopeCategory: scope.category,
      isComplete: false,
      ui: redirect.ui,
    });
    setFirstAnswer("");
    setSelectedChoice("");
    setOtherAnswer("");
    return true;
  }

  function registerQuestion(graph: CaseGraph, data: IntakeUiResult) {
    if (data.isComplete || !data.questionSlot || data.questionSlot === "review" || data.questionSlot === "scope_redirect") {
      return {
        ...graph,
        currentQuestion: data.nextQuestion,
        currentQuestionSlot: data.questionSlot ?? graph.currentQuestionSlot,
      };
    }
    return addQuestionToLedger(graph, data.nextQuestion, data.questionSlot);
  }

  async function routeAnswer(answer: string, graph: CaseGraph) {
    setIsRouting(true);
    try {
      const bodyFindingsContext = bodyFindingsToPromptContext(graph.bodyFindings, language);
      const response = await fetch("/api/intake-ui", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latestAnswer: answer,
          chiefConcern: graph.chiefConcern,
          userNarrative: graph.userNarrative,
          currentQuestion: graph.currentQuestion,
          questionCount: graph.questionCount,
          bodyFindings: graph.bodyFindings,
          bodyFindingsContext,
          allowedChoices: currentUi ? allowedChoiceLabelsForUi(currentUi, language) : undefined,
          caseGraph: graph,
          language,
        }),
      });
      const data = (await response.json()) as IntakeUiResult;
      setCurrentUi(data);
      if (data.isComplete && data.assessment) {
        updateAssessment(await enhanceAssessment(data.assessment, graph), graph);
      }
      setCaseGraph((current) => registerQuestion(current, data));
    } catch {
      const data = fallbackQuestion(graph, language, answer);
      setCurrentUi(data);
      setCaseGraph((current) => registerQuestion(current, data));
    } finally {
      setIsRouting(false);
    }
  }

  async function submitFirstAnswer() {
    const answer =
      firstAnswer.trim() ||
      (activeFinding
        ? `User selected ${labels[activeFinding.region]} on the body map.`
        : "User started a new health check.");
    if (maybeRedirectOutOfScope(answer)) return;
    const graph = applyAnswer(answer);
    await routeAnswer(answer, graph);
  }

  async function submitTranscript(transcript: string) {
    const answer = transcript.trim();
    if (!answer) return;
    setFirstAnswer(answer);
    if (maybeRedirectOutOfScope(answer)) return;
    const graph = applyAnswer(answer);
    await routeAnswer(answer, graph);
  }

  async function submitFollowUp() {
    const isSmartNone = selectedChoice === SMART_NONE_CHOICE;
    const answer = selectedChoice === OPEN_ANSWER
      ? otherAnswer.trim()
      : isSmartNone && currentUi
        ? smartNoneSubmittedAnswer(currentUi, language)
        : selectedChoice.trim();
    if (!answer || !currentUi) return;

    if (currentUi.ui.type === "scope_redirect") {
      await handleScopeRedirectChoice(answer);
      return;
    }

    if (maybeRedirectOutOfScope(answer)) return;

    let graphSeed = isSmartNone
      ? applySmartNoneContext(caseGraph, currentUi, activeFinding, language)
      : caseGraph;
    if (activeFinding && !isSmartNone) {
      const quality = qualityFromAnswer(answer);
      const severity = inferSeverity(answer) as BodyFinding["severity"] | undefined;
      if (quality || typeof severity === "number") {
        graphSeed = updateBodyFinding(
          graphSeed,
          activeFinding.id,
          {
            ...(quality ? { quality } : {}),
            ...(typeof severity === "number" ? { severity } : {}),
            status: "confirmed",
          },
          language,
        );
        setCaseGraph(graphSeed);
      }
    }

    const graph = applyAnswer(isSmartNone ? answer : `Question: ${currentUi.nextQuestion}\nAnswer: ${answer}`, graphSeed);
    setSelectedChoice("");
    setOtherAnswer("");
    await routeAnswer(answer, graph);
  }

  async function handleScopeRedirectChoice(answer: string) {
    const normalized = answer.toLowerCase();
    setSelectedChoice("");
    setOtherAnswer("");

    if (/final review|revisi[oó]n final/.test(normalized)) {
      updateAssessment(fallbackAssessment(caseGraph, language), caseGraph);
      return;
    }

    if (/dashboard/.test(normalized)) {
      onDashboard();
      return;
    }

    if (selectedChoice === OPEN_ANSWER && otherAnswer.trim()) {
      const scopedAnswer = otherAnswer.trim();
      if (maybeRedirectOutOfScope(scopedAnswer)) return;
      const graph = applyAnswer(scopedAnswer);
      await routeAnswer(scopedAnswer, graph);
      return;
    }

    setCurrentUi(null);
    setFirstAnswer("");
  }

  async function enhanceAssessment(baseAssessment: AssessmentResult, graph: CaseGraph) {
    try {
      const response = await fetch("/api/patient-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          assessment: baseAssessment,
          caseGraph: graph,
        }),
      });
      const advice = (await response.json()) as {
        friendlyTitle?: string;
        patientMessage?: string;
        reassurance?: string;
        confidenceLabel?: string;
        gentleNextSteps?: AssessmentResult["nextSteps"];
        careInstructions?: string[];
        urgentCare?: string[];
      };
      return {
        ...baseAssessment,
        friendlyTitle: advice.friendlyTitle ?? baseAssessment.friendlyTitle,
        patientMessage: advice.patientMessage ?? baseAssessment.patientMessage,
        reassurance: advice.reassurance ?? baseAssessment.reassurance,
        confidenceLabel: advice.confidenceLabel ?? baseAssessment.confidenceLabel,
        nextSteps: advice.gentleNextSteps?.length ? advice.gentleNextSteps : baseAssessment.nextSteps,
        careInstructions: advice.careInstructions?.length ? advice.careInstructions : baseAssessment.careInstructions,
        urgentCare: advice.urgentCare?.length ? advice.urgentCare : baseAssessment.urgentCare,
      };
    } catch {
      return baseAssessment;
    }
  }

  function continueReview() {
    if ((caseGraph.questionCount ?? 0) >= HARD_QUESTION_LIMIT) return;

    const nextSlot = chooseReviewContinuationSlot(caseGraph);
    const spec = questionSpecForSlot(nextSlot, language, {
      answer: caseGraph.userNarrative,
      bodyContext: copilotBodyContext,
    });
    const nextGraph = addQuestionToLedger(
      {
        ...caseGraph,
        checkStatus: "active",
        currentQuestion: spec.nextQuestion,
        currentQuestionSlot: nextSlot,
      },
      spec.nextQuestion,
      nextSlot,
    );

    updateAssessment(null);
    setCurrentUi({
      source: "fallback",
      assistantMessage:
        language === "en"
          ? "Let's add one more useful detail to the review."
          : "Agreguemos un detalle util mas a la revision.",
      nextQuestion: spec.nextQuestion,
      questionSlot: nextSlot,
      isComplete: false,
      ui: spec.ui,
    });
    setSelectedChoice("");
    setOtherAnswer("");
    setFirstAnswer("");
    setCaseGraph(nextGraph);
  }

  function handleBodyRegionSelect(region: BodyRegion) {
    const baseCase = caseGraph.checkStatus === "idle" && !caseGraph.scenarioId ? startAdaptiveCheck(language) : caseGraph;
    const ensured = ensureDraftBodyFinding({
      caseGraph: baseCase,
      region,
      source: "user-selected",
      language,
    });
    const data = regionQuestion(region, language);
    setCaseGraph(registerQuestion(ensured.caseGraph, data));
    setActiveFindingId(ensured.finding.id);
    setPreviewRegion(region);
    setFocusedRegion(region);
    setCurrentUi(data);
  }

  function handleBodySubregionSelect(region: BodyRegion, subregion: string) {
    const baseCase = caseGraph.checkStatus === "idle" && !caseGraph.scenarioId ? startAdaptiveCheck(language) : caseGraph;
    const regionFinding =
      activeFinding?.region === region
        ? activeFinding
        : baseCase.bodyFindings.find((finding) => finding.region === region) ?? null;
    const ensured = regionFinding
      ? { caseGraph: baseCase, finding: regionFinding }
      : ensureDraftBodyFinding({
          caseGraph: baseCase,
          region,
          source: "user-selected",
          language,
        });
    const nextSubregion = ensured.finding.subregion === subregion ? null : subregion;
    const nextGraph = updateBodyFinding(
      ensured.caseGraph,
      ensured.finding.id,
      {
        subregion: nextSubregion,
        ...(nextSubregion ? { status: "confirmed" } : {}),
      },
      language,
    );

    const data = regionQuestion(region, language);
    setCaseGraph(registerQuestion(nextGraph, data));
    setActiveFindingId(ensured.finding.id);
    setPreviewRegion(region);
    setFocusedRegion(region);
    setCurrentUi(data);
  }

  function handleBodyRegionShortcut(region: BodyRegion) {
    const isAlreadyMapped =
      previewRegion === region ||
      caseGraph.bodyFindings.some((finding) => finding.region === region) ||
      caseGraph.bodyRegions.some((selection) => selection.region === region);

    if (isAlreadyMapped) {
      removeRegionFromMap(region);
      return;
    }

    handleBodyRegionSelect(region);
  }

  function focusFinding(findingId: string) {
    const finding = caseGraph.bodyFindings.find((item) => item.id === findingId);
    if (!finding) return;

    setActiveFindingId(finding.id);
    setPreviewRegion(finding.region);
    setFocusedRegion(finding.region);
    const data = regionQuestion(finding.region, language);
    setCurrentUi(data);
    setCaseGraph((current) => registerQuestion(current, data));
  }

  function resetBodyView() {
    setFocusedRegion(null);
    setPreviewRegion(null);
  }

  function clearActiveArea() {
    setActiveFindingId(null);
    setFocusedRegion(null);
    setPreviewRegion(null);
  }

  function updateActiveFinding(updates: BodyFindingUpdate) {
    if (!activeFinding) return;
    setCaseGraph((current) => updateBodyFinding(current, activeFinding.id, updates, language));
  }

  function clearRegionPromptIfCurrent(region: BodyRegion) {
    const label = labels[region];
    const isCurrentRegionPrompt =
      currentUi?.ui.type === "body_locator" &&
      currentUi.ui.facts.some((fact) => fact.label === "Body area" && fact.value === label);

    if (isCurrentRegionPrompt) {
      setCurrentUi(null);
    }
  }

  function removeFindingFromMap(findingId: string) {
    const removedFinding = caseGraph.bodyFindings.find((finding) => finding.id === findingId);
    setCaseGraph((current) => removeBodyFinding(current, findingId, language));

    if (removedFinding) {
      clearRegionPromptIfCurrent(removedFinding.region);
    }

    if (
      activeFindingId === findingId ||
      (removedFinding && (previewRegion === removedFinding.region || focusedRegion === removedFinding.region))
    ) {
      clearActiveArea();
    }
  }

  function removeRegionFromMap(region: BodyRegion) {
    setCaseGraph((current) => ({
      ...current,
      bodyRegions: current.bodyRegions.filter((selection) => selection.region !== region),
      bodyFindings: current.bodyFindings.filter((finding) => finding.region !== region),
    }));
    clearRegionPromptIfCurrent(region);

    if (previewRegion === region || focusedRegion === region || activeFinding?.region === region) {
      clearActiveArea();
    }
  }

  function removeActiveFinding() {
    if (!activeFinding) return;
    removeFindingFromMap(activeFinding.id);
  }

  function startVoice() {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      start: () => void;
    };
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .SpeechRecognition ??
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFirstAnswer((value) => value || "Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "en" ? "en-US" : "es-MX";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      void submitTranscript(transcript);
    };
    recognition.start();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || assessment) return;
      if (focusedRegion) {
        event.preventDefault();
        setFocusedRegion(null);
        setPreviewRegion(null);
        return;
      }
      if (activeFindingId || previewRegion) {
        event.preventDefault();
        setActiveFindingId(null);
        setPreviewRegion(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFindingId, assessment, focusedRegion, previewRegion]);

  if (assessment) {
    return (
      <AssessmentPage
        assessment={assessment}
        caseGraph={caseGraph}
        language={language}
        canContinueReview={(caseGraph.questionCount ?? 0) < HARD_QUESTION_LIMIT}
        onContinueReview={continueReview}
        onStartNewCheck={onStartNewCheck}
        onDashboard={onDashboard}
        onSaveRecord={onSaveRecord}
      />
    );
  }

  const selectedRegions = uniqueRegions([
    ...caseGraph.bodyRegions.map((item) => item.region),
    ...caseGraph.bodyFindings.map((item) => item.region),
    ...(previewRegion ? [previewRegion] : []),
  ]);
  const highlightedBodyRegion = activeFinding?.region ?? previewRegion;
  const hasBodyViewFocus = focusedRegion !== null;
  const hasActiveArea = activeFindingId !== null || previewRegion !== null || focusedRegion !== null;
  const canSubmitFirstAnswer = Boolean(firstAnswer.trim() || activeFinding || previewRegion);
  const questionTitle = currentUi ? currentUi.nextQuestion : "What brings you in today?";
  const subtitle = currentUi ? currentUi.assistantMessage : "Share a few words, speak, or tap the body. A rough answer is enough.";

  return (
    <section className="body-view" data-safety={safetyLevel} aria-labelledby="body-view-title">
      <div className="body-view-scene">
        <BodyInteractionModel
          language={language}
          highlightedRegion={highlightedBodyRegion}
          focusedRegion={focusedRegion}
          selectedSubregion={activeFinding?.subregion ?? null}
          onSelect={handleBodyRegionSelect}
          onSelectSubregion={handleBodySubregionSelect}
        />
      </div>

      <header className="body-view-topbar" aria-label="Active check status">
        <div>
          <span>New Check</span>
          <strong>{safetyLevel === "none" ? "Body View" : `${safetyLevel} signal`}</strong>
        </div>
      </header>

      <div className="body-view-hud">
        <div className="body-view-controls" aria-label="Body view controls">
          <button type="button" onClick={resetBodyView} disabled={!hasBodyViewFocus}>
            <RotateCcw size={15} aria-hidden />
            Zoom out
          </button>
          <button type="button" onClick={clearActiveArea} disabled={!hasActiveArea}>
            <MousePointer2 size={15} aria-hidden />
            Close detail
          </button>
        </div>

        <main className="body-view-floating">
          <FloatingQuestionCard
            title={questionTitle}
            subtitle={subtitle}
            currentUi={currentUi}
            language={language}
            firstAnswer={firstAnswer}
            selectedChoice={selectedChoice}
            otherAnswer={otherAnswer}
            isRouting={isRouting}
            isListening={isListening}
            canSubmitFirstAnswer={canSubmitFirstAnswer}
            atlasBodyAreas={
              <AtlasBodyAreaStrip
                language={language}
                caseGraph={caseGraph}
                previewRegion={previewRegion}
                activeFindingId={activeFindingId}
                onFocusFinding={focusFinding}
                onRemoveFinding={removeFindingFromMap}
                onFocusRegion={handleBodyRegionSelect}
                onRemoveRegion={removeRegionFromMap}
              />
            }
            optionalDetails={
              activeFinding ? (
                <BodyFindingEditor
                  key={activeFinding.id}
                  language={language}
                  finding={activeFinding}
                  onUpdate={updateActiveFinding}
                  onRemove={removeActiveFinding}
                  onAddAnother={clearActiveArea}
                />
              ) : null
            }
            onFirstAnswer={setFirstAnswer}
            onSelectChoice={setSelectedChoice}
            onOtherAnswer={setOtherAnswer}
            onSubmitFirst={submitFirstAnswer}
            onSubmitFollowUp={submitFollowUp}
            onVoice={startVoice}
          />
        </main>

        {safetyLevel !== "none" && (
          <aside className="body-view-safety" data-level={safetyLevel}>
            <ShieldAlert size={18} aria-hidden />
            <strong>{safetyLevel === "emergency" ? "Emergency signal" : "Urgent signal"}</strong>
            <span>
              {safetyLevel === "emergency"
                ? "Seek local emergency care now. This intake cannot replace urgent help."
                : "Answer the safety question carefully. The check remains non-diagnostic."}
            </span>
          </aside>
        )}

        <div className="body-view-region-dock">
          <BodyRegionButtons
            language={language}
            highlightedRegion={highlightedBodyRegion}
            selectedRegions={selectedRegions}
            onSelect={handleBodyRegionShortcut}
          />
        </div>
      </div>
    </section>
  );
}

function FloatingQuestionCard({
  title,
  subtitle,
  currentUi,
  language,
  firstAnswer,
  selectedChoice,
  otherAnswer,
  isRouting,
  isListening,
  canSubmitFirstAnswer,
  atlasBodyAreas,
  optionalDetails,
  onFirstAnswer,
  onSelectChoice,
  onOtherAnswer,
  onSubmitFirst,
  onSubmitFollowUp,
  onVoice,
}: {
  title: string;
  subtitle: string;
  currentUi: IntakeUiResult | null;
  language: Language;
  firstAnswer: string;
  selectedChoice: string;
  otherAnswer: string;
  isRouting: boolean;
  isListening: boolean;
  canSubmitFirstAnswer: boolean;
  atlasBodyAreas: ReactNode;
  optionalDetails: ReactNode;
  onFirstAnswer: (value: string) => void;
  onSelectChoice: (value: string) => void;
  onOtherAnswer: (value: string) => void;
  onSubmitFirst: () => void;
  onSubmitFollowUp: () => void;
  onVoice: () => void;
}) {
  return (
    <section className="floating-question-card" data-priority={currentUi?.ui.priority ?? "routine"}>
      <div className="floating-speaker">
        <span>
          <Sparkles size={16} aria-hidden />
          Atlas
        </span>
        <b>{currentUi?.ui.title ?? "Intake"}</b>
      </div>

      <h1 id="body-view-title">{title}</h1>
      <p>{subtitle}</p>
      {atlasBodyAreas}

      {!currentUi ? (
        <div className="floating-open-input">
          <textarea
            value={firstAnswer}
            onChange={(event) => onFirstAnswer(event.target.value)}
            placeholder="Example: Pressure in my head since this morning..."
            rows={4}
          />
          {optionalDetails}
          <div className="floating-actions">
            <button type="button" className="body-view-icon-button" onClick={onVoice} aria-label="Speak answer">
              {isListening ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
            </button>
            <button
              type="button"
              className="floating-primary-action"
              onClick={onSubmitFirst}
              disabled={isRouting || !canSubmitFirstAnswer}
            >
              {isRouting ? "Preparing..." : "Continue"}
            </button>
          </div>
        </div>
      ) : (
        <div className="floating-choice-flow">
          <div className="floating-choice-grid" aria-label="Multiple choice answers">
            {choiceOptionsForUi(currentUi, language).map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={[
                  selectedChoice === choice.value ? "selected" : "",
                  choice.kind !== "standard" ? "utility" : "",
                  choice.kind === "none" ? "smart-none" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => onSelectChoice(choice.value)}
              >
                {choice.label}
              </button>
            ))}
          </div>

          {selectedChoice === OPEN_ANSWER && (
            <label className="floating-open-input compact">
              <span>Write my own answer</span>
              <textarea
                value={otherAnswer}
                onChange={(event) => onOtherAnswer(event.target.value)}
                placeholder="A short answer is fine."
                rows={3}
              />
            </label>
          )}

          {optionalDetails}

          <div className="floating-actions">
            <button
              type="button"
              className="floating-primary-action"
              onClick={onSubmitFollowUp}
              disabled={isRouting || !selectedChoice || (selectedChoice === OPEN_ANSWER && !otherAnswer.trim())}
            >
              {isRouting ? "Preparing..." : "Continue"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function BodyFindingEditor({
  language,
  finding,
  onUpdate,
  onRemove,
  onAddAnother,
}: {
  language: Language;
  finding: BodyFinding;
  onUpdate: (updates: BodyFindingUpdate) => void;
  onRemove: () => void;
  onAddAnother: () => void;
}) {
  const subregionOptions = getBodySubregionOptions(finding.region, language);
  const wholeAreaLabel = language === "en" ? "Whole area" : "Area completa";
  const selectedLocationLabel = finding.subregion
    ? getBodySubregionLabel(finding.region, finding.subregion, language)
    : wholeAreaLabel;
  const selectedAreaLabel = regionLabels[language][finding.region];
  const notSetLabel = language === "en" ? "Not set" : "Sin elegir";
  const selectedStrengthLabel = typeof finding.severity === "number" ? `${finding.severity}/10` : notSetLabel;
  const selectedQualityLabel = qualityOptions.find((option) => option.value === finding.quality)?.label ?? notSetLabel;
  const optionalLocationCopy =
    language === "en"
      ? "Optional. Tap a smaller part, or keep Whole area if you are not sure."
      : "Opcional. Toca una parte mas pequena o deja Area completa si no estas seguro.";
  const optionalBadge = language === "en" ? "Optional" : "Opcional";
  const optionalStrengthCopy =
    language === "en"
      ? "Optional. Skip it if you are not sure yet."
      : "Opcional. Saltalo si aun no estas seguro.";
  const optionalQualityCopy =
    language === "en"
      ? "Optional. Choose one only if it helps describe the feeling."
      : "Opcional. Elige una solo si ayuda a describir la sensacion.";
  const optionalDetailsLabel = language === "en" ? "Optional details" : "Detalles opcionales";
  const selectedAreaCopy = language === "en" ? "Selected area" : "Zona seleccionada";
  const optionalDetailsCopy =
    language === "en"
      ? "Open only if you want to add more detail."
      : "Abre solo si quieres agregar mas detalle.";
  const removeCopy = language === "en" ? "Remove body finding" : "Quitar zona del cuerpo";
  const addAnotherCopy = language === "en" ? "Add another area" : "Agregar otra zona";
  const strengthCopy = language === "en" ? "How strong is it?" : "Que tan fuerte es?";
  const qualityCopy = language === "en" ? "What does it feel like?" : "Como se siente?";
  const noteCopy = language === "en" ? "Add a short note" : "Agrega una nota corta";

  return (
    <details className="atlas-optional-details" aria-labelledby="body-finding-editor-title">
      <summary className="atlas-optional-summary">
        <div>
          <span>{optionalDetailsLabel}</span>
          <strong id="body-finding-editor-title">{selectedAreaCopy}: {selectedAreaLabel}</strong>
          <p>{optionalDetailsCopy}</p>
        </div>
        <ChevronDown className="atlas-optional-chevron" size={17} aria-hidden />
      </summary>

      <div className="atlas-optional-details-body">
        <div className="atlas-optional-remove-row">
          <button type="button" onClick={onRemove} aria-label={removeCopy}>
            <X size={16} aria-hidden />
            {removeCopy}
          </button>
        </div>

        <details className="finding-dropdown">
          <summary>
            <div className="finding-control-copy">
              <strong>Where exactly? <span>{optionalBadge}</span></strong>
              <p>{optionalLocationCopy}</p>
            </div>
            <em>{selectedLocationLabel}</em>
            <ChevronDown className="finding-dropdown-icon" size={16} aria-hidden />
          </summary>
          <div className="subregion-picker" aria-label={language === "en" ? "Precise body location" : "Ubicacion precisa del cuerpo"}>
            <button type="button" className={!finding.subregion ? "selected" : ""} aria-pressed={!finding.subregion} onClick={() => onUpdate({ subregion: null })}>
              {wholeAreaLabel}
            </button>
            {subregionOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={finding.subregion === option.id ? "selected" : ""}
                aria-pressed={finding.subregion === option.id}
                onClick={() => onUpdate({ subregion: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </details>

        <details className="finding-dropdown">
          <summary>
            <div className="finding-control-copy">
              <strong>{strengthCopy} <span>{optionalBadge}</span></strong>
              <p>{optionalStrengthCopy}</p>
            </div>
            <em>{selectedStrengthLabel}</em>
            <ChevronDown className="finding-dropdown-icon" size={16} aria-hidden />
          </summary>
          <div className="severity-picker">
            {severityValues.map((value) => (
              <button
                key={value}
                type="button"
                className={finding.severity === value ? "selected" : ""}
                onClick={() => onUpdate({ severity: value, status: "confirmed" })}
              >
                {value}
              </button>
            ))}
          </div>
        </details>

        <details className="finding-dropdown">
          <summary>
            <div className="finding-control-copy">
              <strong>{qualityCopy} <span>{optionalBadge}</span></strong>
              <p>{optionalQualityCopy}</p>
            </div>
            <em>{selectedQualityLabel}</em>
            <ChevronDown className="finding-dropdown-icon" size={16} aria-hidden />
          </summary>
          <div className="quality-picker">
            {qualityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={finding.quality === option.value ? "selected" : ""}
                onClick={() => onUpdate({ quality: option.value, status: option.value === "unknown" ? "draft" : "confirmed" })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </details>

        {(finding.quality === "other" || finding.notes) && (
          <label className="finding-notes">
            <span>{noteCopy}</span>
            <textarea
              value={finding.notes ?? ""}
              onChange={(event) => onUpdate({ notes: event.target.value, status: "confirmed" })}
              rows={3}
            />
          </label>
        )}

        <div className="finding-editor-actions">
          <span>{formatBodyFinding(finding, language)}</span>
          <button type="button" onClick={onAddAnother}>
            <Plus size={15} aria-hidden />
            {addAnotherCopy}
          </button>
        </div>
      </div>
    </details>
  );
}

function regionQuestion(region: BodyRegion, language: Language): IntakeUiResult {
  const label = regionLabels[language][region];
  return {
    source: "fallback",
    assistantMessage:
      language === "en"
        ? `I added ${label} to your body map.`
        : `Agregue ${label} a tu mapa corporal.`,
    nextQuestion: language === "en" ? `What do you feel in ${label}?` : `Que sientes en ${label}?`,
    questionSlot: "quality",
    isComplete: false,
    ui: {
      type: "body_locator",
      title: "Body finding",
      summary: language === "en" ? "Selected on the body map." : "Seleccionado en el mapa corporal.",
      priority: "routine",
      facts: [{ label: "Body area", value: label }],
      choices: ["Pressure", "Sharp pain", "Burning", "Numbness"],
      actions: ["Choose one answer", "Set intensity", "Continue"],
    },
  };
}

function fallbackQuestion(graph: CaseGraph, language: Language, answer: string): IntakeUiResult {
  const bodyContext = bodyFindingsToPromptContext(graph.bodyFindings, language);
  const chosenSlot = chooseNextQuestionSlot(graph, answer);
  const nextSlot = chosenSlot === "review" ? "timeline" : chosenSlot;
  const spec = questionSpecForSlot(nextSlot, language, { answer, bodyContext });
  return {
    source: "fallback",
    assistantMessage: spec.assistantMessage,
    nextQuestion: graph.currentQuestion ?? spec.nextQuestion,
    questionSlot: nextSlot,
    isComplete: false,
    ui: spec.ui,
  };
}

function chooseReviewContinuationSlot(graph: CaseGraph): IntakeQuestionSlot {
  if (!graph.bodyFindings.length && !graph.bodyRegions.length) return "body_location";
  if (graph.bodyFindings.length && !graph.bodyFindings.some((finding) => finding.subregion)) return "body_precision";
  if (graph.bodyFindings.length && !graph.bodyFindings.some((finding) => finding.quality && finding.quality !== "unknown")) {
    return "quality";
  }
  if (
    !graph.bodyFindings.some((finding) => typeof finding.severity === "number") &&
    !graph.symptoms.some((symptom) => typeof symptom.severity === "number")
  ) {
    return "severity";
  }
  if (!graph.timeline.length) return "timeline";
  if (!graph.questionLedger?.some((entry) => entry.slot === "red_flags" && entry.answered)) return "red_flags";
  if (!graph.medicalHistory.length) return "medical_history";
  if (!graph.medications.length && !graph.allergies.length) return "medications_allergies";
  return graph.bodyFindings.length ? "body_precision" : "body_location";
}

function choiceOptionsForUi(currentUi: IntakeUiResult, language: Language): AtlasChoiceOption[] {
  const smartNoneLabel = smartNoneChoiceLabel(currentUi, language);
  const standardChoices = fillStandardChoices(currentUi.ui.choices, currentUi, language, smartNoneLabel).map((choice) => ({
    value: choice,
    label: choice,
    kind: "standard" as const,
  }));

  return [
    ...standardChoices,
    { value: OPEN_ANSWER, label: OPEN_ANSWER, kind: "open" },
    { value: SMART_NONE_CHOICE, label: smartNoneLabel, kind: "none" },
  ];
}

function allowedChoiceLabelsForUi(currentUi: IntakeUiResult, language: Language) {
  return choiceOptionsForUi(currentUi, language).map((choice) => choice.label);
}

function fillStandardChoices(
  choices: string[],
  currentUi: IntakeUiResult,
  language: Language,
  smartNoneLabel: string,
) {
  const output: string[] = [];
  const candidates = [...choices, ...defaultChoicesForSlot(questionSlotForChoiceUi(currentUi), language)];

  for (const choice of candidates) {
    if (output.length >= 4) break;
    if (isReservedGeneratedChoice(choice, smartNoneLabel)) continue;
    if (output.some((existing) => normalizeChoiceLabel(existing) === normalizeChoiceLabel(choice))) continue;
    output.push(choice);
  }

  return output.slice(0, 4);
}

function isReservedGeneratedChoice(choice: string, smartNoneLabel: string) {
  const normalized = normalizeChoiceLabel(choice);
  const smartNone = normalizeChoiceLabel(smartNoneLabel);
  return (
    !normalized ||
    normalized === smartNone ||
    normalized === "other" ||
    normalized === normalizeChoiceLabel(OPEN_ANSWER) ||
    normalized === "none" ||
    normalized === "no" ||
    normalized === "none no" ||
    normalized === "not applicable" ||
    normalized === "no aplica" ||
    normalized === "nada de esto" ||
    normalized === "nada conocido" ||
    normalized.startsWith("none of") ||
    normalized.startsWith("none known")
  );
}

function normalizeChoiceLabel(choice: string) {
  return choice
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionSlotForChoiceUi(currentUi: IntakeUiResult): IntakeQuestionSlot {
  if (currentUi.questionSlot) return currentUi.questionSlot;
  if (currentUi.ui.type === "severity_scale") return "severity";
  if (currentUi.ui.type === "timeline") return "timeline";
  if (currentUi.ui.type === "red_flags") return "red_flags";
  if (currentUi.ui.type === "medication_history") return "medical_history";
  if (currentUi.ui.type === "scope_redirect") return "scope_redirect";
  return "quality";
}

function defaultChoicesForSlot(slot: IntakeQuestionSlot, language: Language) {
  const choices: Record<Language, Record<IntakeQuestionSlot, string[]>> = {
    en: {
      chief_concern: ["Pain", "Breathing", "Digestive issue", "Fatigue"],
      body_location: ["Head or neck", "Chest", "Abdomen", "Back or limbs"],
      body_precision: ["Upper area", "Lower area", "Left side", "Right side"],
      quality: ["Pressure", "Sharp pain", "Burning", "Numbness"],
      severity: ["Mild", "Moderate", "Severe", "Worst yet"],
      timeline: ["Started today", "A few days", "Getting worse", "Comes and goes"],
      red_flags: ["Trouble breathing", "Fainting/weakness", "Heavy bleeding", "Severe allergic reaction"],
      medical_history: ["Chronic condition", "Recent surgery", "Pregnancy/postpartum", "Recent hospital visit"],
      medications_allergies: ["Current medicine", "New medicine", "Blood thinner", "Allergy"],
      review: ["Final review", "Add body area", "Add timing", "Add medicines"],
      scope_redirect: ["Describe symptoms", "Use body map", "Final review", "Dashboard"],
    },
    es: {
      chief_concern: ["Dolor", "Respiracion", "Digestivo", "Cansancio"],
      body_location: ["Cabeza o cuello", "Pecho", "Abdomen", "Espalda o extremidades"],
      body_precision: ["Parte superior", "Parte inferior", "Lado izquierdo", "Lado derecho"],
      quality: ["Presion", "Punzante", "Ardor", "Entumecimiento"],
      severity: ["Leve", "Moderado", "Severo", "Lo peor"],
      timeline: ["Empezo hoy", "Hace dias", "Empeora", "Va y viene"],
      red_flags: ["Falta de aire", "Desmayo/debilidad", "Sangrado fuerte", "Alergia severa"],
      medical_history: ["Condicion cronica", "Cirugia reciente", "Embarazo/posparto", "Visita reciente"],
      medications_allergies: ["Medicina actual", "Medicina nueva", "Anticoagulante", "Alergia"],
      review: ["Revision final", "Agregar area", "Agregar tiempo", "Agregar medicinas"],
      scope_redirect: ["Describir sintomas", "Usar mapa corporal", "Revision final", "Dashboard"],
    },
  };

  return choices[language][slot];
}

function smartNoneChoiceLabel(currentUi: IntakeUiResult, language: Language) {
  const slot = questionSlotForChoiceUi(currentUi);
  const labels: Record<Language, Record<IntakeQuestionSlot, string>> = {
    en: {
      chief_concern: "Not sure yet",
      body_location: "No specific area",
      body_precision: "Whole area is fine",
      quality: "Not sure",
      severity: "No pain / not applicable",
      timeline: "Not sure when",
      red_flags: "None of these",
      medical_history: "None known",
      medications_allergies: "None known",
      review: "Not applicable",
      scope_redirect: "Not applicable",
    },
    es: {
      chief_concern: "No estoy seguro",
      body_location: "Sin area especifica",
      body_precision: "Area completa esta bien",
      quality: "No estoy seguro",
      severity: "Sin dolor / no aplica",
      timeline: "No se cuando",
      red_flags: "Nada de esto",
      medical_history: "Nada conocido",
      medications_allergies: "Nada conocido",
      review: "No aplica",
      scope_redirect: "No aplica",
    },
  };

  return labels[language][slot];
}

function smartNoneSubmittedAnswer(currentUi: IntakeUiResult, language: Language) {
  const slot = questionSlotForChoiceUi(currentUi);
  const answers: Record<Language, Record<IntakeQuestionSlot, string>> = {
    en: {
      chief_concern: "Not sure yet.",
      body_location: "No specific area.",
      body_precision: "Whole selected area is fine.",
      quality: "Not sure how to describe the feeling.",
      severity: "Intensity does not apply.",
      timeline: "Not sure when.",
      red_flags: "No listed warning signs.",
      medical_history: "Nothing relevant known.",
      medications_allergies: "Nothing relevant applies.",
      review: "Not applicable.",
      scope_redirect: "Not applicable.",
    },
    es: {
      chief_concern: "No estoy seguro todavia.",
      body_location: "Sin area especifica.",
      body_precision: "El area completa esta bien.",
      quality: "No estoy seguro de como describir la sensacion.",
      severity: "La intensidad no aplica.",
      timeline: "No se cuando.",
      red_flags: "Ninguna senal de alarma listada.",
      medical_history: "Nada relevante conocido.",
      medications_allergies: "Nada relevante aplica.",
      review: "No aplica.",
      scope_redirect: "No aplica.",
    },
  };

  return answers[language][slot];
}

function applySmartNoneContext(
  graph: CaseGraph,
  currentUi: IntakeUiResult,
  activeFinding: BodyFinding | null,
  language: Language,
) {
  const slot = questionSlotForChoiceUi(currentUi);
  let nextGraph = appendRelevantNegative(graph, smartNoneNegative(slot, language));

  if (activeFinding && slot === "body_precision") {
    nextGraph = updateBodyFinding(nextGraph, activeFinding.id, { subregion: null, status: "confirmed" }, language);
  }

  if (activeFinding && slot === "quality") {
    nextGraph = updateBodyFinding(nextGraph, activeFinding.id, { quality: "unknown", status: "draft" }, language);
  }

  return nextGraph;
}

function smartNoneNegative(slot: IntakeQuestionSlot, language: Language) {
  const negatives: Partial<Record<IntakeQuestionSlot, Record<Language, string>>> = {
    body_location: {
      en: "No specific body area reported.",
      es: "Sin zona especifica reportada.",
    },
    body_precision: {
      en: "Whole selected area kept.",
      es: "Se mantuvo el area completa seleccionada.",
    },
    quality: {
      en: "Symptom quality not specified.",
      es: "Sensacion no especificada.",
    },
    severity: {
      en: "Intensity not applicable.",
      es: "Intensidad no aplicable.",
    },
    timeline: {
      en: "Timing not known.",
      es: "Tiempo no conocido.",
    },
    red_flags: {
      en: "Denied listed warning signs.",
      es: "Niega las senales de alarma listadas.",
    },
    medical_history: {
      en: "No relevant background reported.",
      es: "Sin antecedentes relevantes reportados.",
    },
    medications_allergies: {
      en: "No medicine or allergy context reported.",
      es: "Sin contexto de medicinas o alergias reportado.",
    },
  };

  return negatives[slot]?.[language];
}

function appendRelevantNegative(graph: CaseGraph, value?: string) {
  if (!value) return graph;
  return {
    ...graph,
    relevantNegatives: Array.from(new Set([...graph.relevantNegatives, value])).slice(0, 8),
  };
}

function qualityFromAnswer(answer: string): BodyFindingQuality | undefined {
  if (/pressure|press|opres|presi[oó]n/i.test(answer)) return "pressure";
  if (/sharp|stab|punz|agudo/i.test(answer)) return "sharp";
  if (/burn|ardor|quem/i.test(answer)) return "burning";
  if (/cramp|c[oó]lic|colic/i.test(answer)) return "cramping";
  if (/numb|tingl|entum|hormigue/i.test(answer)) return "numbness";
  if (/not sure|unknown|no s[eé]|no estoy/i.test(answer)) return "unknown";
  if (answer === OPEN_ANSWER) return "other";
  return undefined;
}

function fallbackAssessment(caseGraph: CaseGraph, language: Language): AssessmentResult {
  const symptom = caseGraph.symptoms[0]?.label;
  return {
    condition: language === "en" ? "Primary review" : "Revision principal",
    confidence: 68,
    rationale: symptom
      ? `Based on the reported pattern: ${symptom.slice(0, 120)}`
      : "Based on the answers provided in this check.",
    nextSteps: [],
    correlations: [],
    careInstructions: [],
    urgentCare: [],
  };
}

function uniqueRegions(regions: BodyRegion[]) {
  return Array.from(new Set(regions));
}
