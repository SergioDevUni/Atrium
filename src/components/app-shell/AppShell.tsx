"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { ConditionTreeView } from "@/components/condition-tree/ConditionTreeView";
import { NewEntryFlow } from "@/components/new-entry/NewEntryFlow";
import { EntryView } from "@/components/entry-view/EntryView";
import { RecordsDashboard } from "@/components/records/RecordsDashboard";
import { startAdaptiveCheck } from "@/lib/agent-flow";
import { createInitialCase } from "@/lib/case-data";
import {
  clearActiveDraft,
  deleteCheckRecord,
  hydrateCheckStorage,
  listCheckRecords,
  saveActiveDraft,
  saveCheckRecord,
  shouldPersistDraft,
} from "@/lib/check-storage";
import { text } from "@/lib/i18n";
import { scenarioToCaseGraph, teachingScenarios } from "@/lib/scenarios";
import { detectRedFlags, highestSafetyLevel } from "@/lib/safety";
import type { AssessmentResult, CaseGraph, CheckDraft, CheckRecord, Language } from "@/lib/types";
import { AppTopbar } from "./AppTopbar";

export type AppView = "home" | "check" | "dashboard" | "conditions";

type AppShellProps = {
  initialView?: AppView;
};

export function AppShell({ initialView = "home" }: AppShellProps) {
  const [language, setLanguage] = useState<Language>("en");
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<AppView>(initialView);
  const [history, setHistory] = useState<CheckRecord[]>([]);
  const [draft, setDraft] = useState<CheckDraft | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<AssessmentResult | null>(null);
  const [isDraftAutosavePaused, setIsDraftAutosavePaused] = useState(false);
  const [caseGraph, setCaseGraph] = useState<CaseGraph>(() =>
    initialView === "check" ? startAdaptiveCheck("en") : createInitialCase("en"),
  );

  const t = text[language];
  const safetyLevel = highestSafetyLevel(caseGraph.redFlags);

  useEffect(() => {
    const handlePopState = () => {
      const nextView = getViewFromUrl();
      setView(nextView);
      if (nextView === "check") {
        setCaseGraph((current) => (current.checkStatus === "idle" ? startAdaptiveCheck(current.language) : current));
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const storage = await hydrateCheckStorage();
        if (cancelled) return;
        setHistory(storage.history);
        setDraft(storage.draft);

        if (storage.draft && initialView === "check") {
          setLanguage(storage.draft.language);
          setCaseGraph(storage.draft.snapshot);
          setActiveAssessment(storage.draft.assessment ?? null);
        }
      } catch {
        if (cancelled) return;
        setHistory([]);
        setDraft(null);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialView]);

  useEffect(() => {
    if (!isReady || isDraftAutosavePaused) return;
    const timer = window.setTimeout(async () => {
      try {
        if (shouldPersistDraft(caseGraph, activeAssessment)) {
          setDraft(await saveActiveDraft(caseGraph, activeAssessment));
        }
      } catch {
        // Storage is best-effort local persistence; the active in-memory check remains usable.
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [activeAssessment, caseGraph, isDraftAutosavePaused, isReady]);

  function handleAssessmentChange(nextAssessment: AssessmentResult | null, snapshot = caseGraph) {
    setActiveAssessment(nextAssessment);
    if (!nextAssessment) {
      setIsDraftAutosavePaused(false);
      return;
    }

    if (!isDraftAutosavePaused && shouldPersistDraft(snapshot, nextAssessment)) {
      void saveActiveDraft(snapshot, nextAssessment)
        .then((nextDraft) => {
          if (nextDraft) setDraft(nextDraft);
        })
        .catch(() => {
          // Storage is best-effort local persistence; debounced autosave will try again.
        });
    }
  }

  function navigate(nextView: AppView, mode: "push" | "replace" = "push") {
    setView(nextView);
    if (typeof window === "undefined") return;

    const nextUrl = urlForView(nextView);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    window.history[mode === "replace" ? "replaceState" : "pushState"]({ view: nextView }, "", nextUrl);
  }

  async function switchLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    const activeScenario = teachingScenarios.find((scenario) => scenario.id === caseGraph.scenarioId);
    const nextCase = activeScenario
      ? applySafety(scenarioToCaseGraph(activeScenario, nextLanguage))
      : caseGraph.checkStatus === "active" || caseGraph.checkStatus === "review-ready"
        ? startAdaptiveCheck(nextLanguage)
        : createInitialCase(nextLanguage);
    setCaseGraph(nextCase);
  }

  async function startNewCheck() {
    await clearActiveDraft();
    setDraft(null);
    setActiveAssessment(null);
    setIsDraftAutosavePaused(false);
    setCaseGraph(startAdaptiveCheck(language));
    navigate("check");
  }

  function openRecord(record: CheckRecord) {
    setLanguage(record.language);
    setCaseGraph(record.snapshot);
    setActiveAssessment(record.assessment ?? null);
    setIsDraftAutosavePaused(false);
    navigate("check");
  }

  function openDraft() {
    if (!draft) return;
    setLanguage(draft.language);
    setCaseGraph(draft.snapshot);
    setActiveAssessment(draft.assessment ?? null);
    setIsDraftAutosavePaused(false);
    navigate("check");
  }

  async function discardDraft() {
    await clearActiveDraft();
    setDraft(null);
    setActiveAssessment(null);
    setIsDraftAutosavePaused(false);
    if (view === "check") {
      setCaseGraph(createInitialCase(language));
      navigate("home");
    }
  }

  async function saveCurrentRecord(snapshot: CaseGraph, assessment?: AssessmentResult) {
    const record = await saveCheckRecord(snapshot, assessment);
    setHistory(await listCheckRecords());
    setDraft(null);
    setActiveAssessment(assessment ?? null);
    setIsDraftAutosavePaused(true);
    return record;
  }

  async function removeRecord(record: CheckRecord) {
    setHistory(await deleteCheckRecord(record.id));
  }

  const importantSymptoms = Array.from(
    new Set([
      ...caseGraph.symptoms.map((symptom) => symptom.label),
      ...history.flatMap((record) => record.importantSymptoms),
    ]),
  ).slice(0, 6);
  const followUps = Array.from(
    new Set([...caseGraph.missingInfo, ...history.flatMap((record) => record.snapshot.missingInfo)]),
  ).slice(0, 6);

  return (
    <main className="workspace">
      <AppTopbar
        hidden={false}
        activeView={view}
        language={language}
        t={t}
        onHome={() => navigate("home")}
        onNewCheck={startNewCheck}
        onDashboard={() => navigate("dashboard")}
        onConditionTree={() => navigate("conditions")}
        onLanguage={switchLanguage}
      />

      <section className="safety-strip" data-level={safetyLevel} hidden={view === "home" || view === "check"}>
        <ShieldAlert size={18} aria-hidden />
        <span>
          {safetyLevel === "emergency"
            ? t.emergency
            : safetyLevel === "urgent"
              ? t.urgent
              : t.safety}
        </span>
      </section>

      {view === "home" && <EntryView onNewCheck={startNewCheck} onDashboard={() => navigate("dashboard")} />}

      {view === "dashboard" && (
        <RecordsDashboard
          t={t}
          history={history}
          draft={draft}
          currentCase={caseGraph}
          importantSymptoms={importantSymptoms}
          followUps={followUps}
          onNewCheck={startNewCheck}
          onOpenRecord={openRecord}
          onOpenDraft={openDraft}
          onDiscardDraft={discardDraft}
          onDeleteRecord={removeRecord}
        />
      )}

      {view === "conditions" && (
        <ConditionTreeView
          language={language}
          currentCase={caseGraph}
          onNewCheck={startNewCheck}
          onDashboard={() => navigate("dashboard")}
        />
      )}

      {view === "check" && (
        <NewEntryFlow
          language={language}
          caseGraph={caseGraph}
          setCaseGraph={setCaseGraph}
          initialAssessment={activeAssessment}
          onAssessmentChange={handleAssessmentChange}
          onCancel={() => navigate("home")}
          onDashboard={() => navigate("dashboard")}
          onStartNewCheck={startNewCheck}
          onSaveRecord={saveCurrentRecord}
        />
      )}
    </main>
  );
}

function applySafety(caseGraph: CaseGraph) {
  return { ...caseGraph, redFlags: detectRedFlags(caseGraph) };
}

function getViewFromUrl(): AppView {
  if (typeof window === "undefined") return "home";
  return normalizeView(new URLSearchParams(window.location.search).get("view"));
}

function normalizeView(value: string | null): AppView {
  if (value === "check" || value === "dashboard" || value === "conditions") return value;
  return "home";
}

function urlForView(view: AppView) {
  const url = new URL(window.location.href);
  if (view === "home") {
    url.searchParams.delete("view");
  } else {
    url.searchParams.set("view", view);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
