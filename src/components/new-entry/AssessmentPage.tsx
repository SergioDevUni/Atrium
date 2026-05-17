"use client";

import { useState } from "react";
import { LayoutDashboard, MessageSquareMore, RotateCcw, Save, ShieldAlert } from "lucide-react";
import { bodyFindingsToPromptContext, formatBodyFinding } from "@/lib/body-findings";
import { regionLabels } from "@/lib/i18n";
import { highestSafetyLevel } from "@/lib/safety";
import type { AssessmentResult, CaseGraph, Language } from "@/lib/types";
import { BodyInteractionModel } from "./BodyInteractionModel";

type AssessmentPageProps = {
  assessment: AssessmentResult;
  caseGraph: CaseGraph;
  language: Language;
  canContinueReview: boolean;
  onContinueReview: () => void;
  onStartNewCheck: () => void;
  onDashboard: () => void;
  onSaveRecord: (caseGraph: CaseGraph, assessment?: AssessmentResult) => Promise<unknown> | unknown;
};

export function AssessmentPage({
  assessment,
  caseGraph,
  language,
  canContinueReview,
  onContinueReview,
  onStartNewCheck,
  onDashboard,
  onSaveRecord,
}: AssessmentPageProps) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const safetyLevel = highestSafetyLevel(caseGraph.redFlags);
  const bodyFindingsContext = bodyFindingsToPromptContext(caseGraph.bodyFindings, language);
  const primaryRegion = caseGraph.bodyFindings[0]?.region ?? caseGraph.bodyRegions[0]?.region ?? null;
  const primarySubregion = caseGraph.bodyFindings[0]?.subregion ?? null;
  const reportedAreas = reportBodyAreas(caseGraph, language);
  const reportedIntensity = reportIntensity(caseGraph, language);
  const reportedTiming = reportTiming(caseGraph, language);
  const reportedWarnings = reportWarnings(caseGraph, language);
  const reportedMedicine = reportMedicine(caseGraph, language);
  const reviewTitle = assessment.friendlyTitle ?? assessment.condition;
  const reviewMessage = assessment.patientMessage ?? assessment.rationale;
  const nextSteps = assessment.nextSteps.length
    ? assessment.nextSteps
    : [
        {
          title: language === "en" ? "Keep notes" : "Guarda notas",
          description:
            language === "en"
              ? "Track changes in timing, intensity, and body area."
              : "Registra cambios de tiempo, intensidad y area del cuerpo.",
          cta: language === "en" ? "Continue review" : "Continuar revision",
        },
        {
          title: language === "en" ? "Prepare for a visit" : "Prepara la consulta",
          description:
            language === "en"
              ? "Use this summary to explain what changed and what worries you."
              : "Usa este resumen para explicar que cambio y que te preocupa.",
          cta: language === "en" ? "Save review" : "Guardar revision",
        },
      ];
  const careInstructions = assessment.careInstructions.length
    ? assessment.careInstructions
    : language === "en"
      ? ["Monitor symptoms and changes.", "Avoid triggers that seem to worsen symptoms.", "Keep notes for a clinician."]
      : ["Vigila sintomas y cambios.", "Evita lo que parezca empeorar los sintomas.", "Guarda notas para un clinico."];
  const urgentCare = assessment.urgentCare.length
    ? assessment.urgentCare
    : language === "en"
      ? ["Symptoms rapidly worsen", "Severe or unusual pain appears", "New confusion, weakness, fainting, or trouble breathing"]
      : ["Los sintomas empeoran rapido", "Aparece dolor fuerte o inusual", "Confusion, debilidad, desmayo o dificultad para respirar"];
  const saveCopy = language === "en" ? "Save review" : "Guardar revision";
  const savedCopy = language === "en" ? "Saved" : "Guardado";
  const savingCopy = language === "en" ? "Saving..." : "Guardando...";
  const saveErrorCopy = language === "en" ? "Try again" : "Intentar de nuevo";

  async function saveReview() {
    setSaveState("saving");
    try {
      await onSaveRecord(caseGraph, assessment);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="assessment-page" aria-labelledby="assessment-title">
      <div className="assessment-body-backdrop" aria-hidden>
        <BodyInteractionModel
          language={language}
          highlightedRegion={primaryRegion}
          focusedRegion={primaryRegion}
          selectedSubregion={primarySubregion}
          onSelect={() => undefined}
        />
      </div>

      <main className="assessment-layout">
        <header className="assessment-hero">
          <div>
            <span>Primary Review</span>
            <h1 id="assessment-title">{reviewTitle}</h1>
            <p>{reviewMessage}</p>
            {assessment.reassurance && <em>{assessment.reassurance}</em>}
          </div>
          <aside className={`assessment-safety-pill level-${safetyLevel}`}>
            <ShieldAlert size={18} aria-hidden />
            <strong>{safetyLabel(safetyLevel, language)}</strong>
            <span>{safetyDescription(safetyLevel, language)}</span>
          </aside>
        </header>

        <section className="assessment-main">
          <section className="assessment-review-panel" aria-labelledby="reported-title">
            <div className="assessment-section-head">
              <span>{language === "en" ? "Review brief" : "Resumen"}</span>
              <h2 id="reported-title">{language === "en" ? "What you told us" : "Lo que nos dijiste"}</h2>
            </div>

            <div className="assessment-fact-grid">
              <ReviewFact label={language === "en" ? "Body areas" : "Areas"} value={reportedAreas} />
              <ReviewFact label={language === "en" ? "Intensity" : "Intensidad"} value={reportedIntensity} />
              <ReviewFact label={language === "en" ? "Timing" : "Tiempo"} value={reportedTiming} />
              <ReviewFact label={language === "en" ? "Watchouts" : "Alertas"} value={reportedWarnings} />
              <ReviewFact label={language === "en" ? "Medicines/allergies" : "Medicinas/alergias"} value={reportedMedicine} />
              <ReviewFact label={language === "en" ? "Answers" : "Respuestas"} value={`${caseGraph.questionCount ?? 0}`} />
            </div>

            <div className="assessment-body-list">
              <h3>{language === "en" ? "Body map notes" : "Notas del mapa corporal"}</h3>
              {caseGraph.bodyFindings.length || caseGraph.bodyRegions.length ? (
                <div>
                  {caseGraph.bodyFindings.length
                    ? caseGraph.bodyFindings.map((finding) => (
                        <article key={finding.id}>
                          <span>{finding.status === "confirmed" ? (language === "en" ? "Added detail" : "Detalle agregado") : (language === "en" ? "Draft" : "Borrador")}</span>
                          <strong>{formatBodyFinding(finding, language)}</strong>
                        </article>
                      ))
                    : caseGraph.bodyRegions.map((selection) => (
                        <article key={selection.region}>
                          <span>{language === "en" ? "Selected area" : "Area seleccionada"}</span>
                          <strong>{regionLabels[language][selection.region]}</strong>
                        </article>
                      ))}
                </div>
              ) : (
                <p>{language === "en" ? "No body area was selected yet." : "Todavia no se selecciono un area del cuerpo."}</p>
              )}
              {bodyFindingsContext && <pre>{bodyFindingsContext}</pre>}
            </div>
          </section>

          <aside className="assessment-side-panel">
            <section className="assessment-care-panel">
              <div className="assessment-section-head">
                <span>{language === "en" ? "Care" : "Cuidado"}</span>
                <h2>{language === "en" ? "Care instructions" : "Instrucciones de cuidado"}</h2>
              </div>
              <ul>
                {careInstructions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="assessment-next-panel">
              <div className="assessment-section-head">
                <span>{language === "en" ? "Next" : "Siguiente"}</span>
                <h2>{language === "en" ? "Next steps" : "Siguientes pasos"}</h2>
              </div>
              <div>
                {nextSteps.slice(0, 3).map((step) => (
                  <article key={step.title}>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="assessment-urgent-panel">
              <div className="assessment-section-head">
                <span>{language === "en" ? "Watch" : "Vigila"}</span>
                <h2>{language === "en" ? "Get help now if" : "Busca ayuda ahora si"}</h2>
              </div>
              <ul>
                {urgentCare.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </aside>
        </section>

        <nav className="assessment-actions" aria-label="Review actions">
          <button type="button" className="primary" onClick={saveReview} disabled={saveState === "saving" || saveState === "saved"}>
            <Save size={16} aria-hidden />
            {saveState === "saving" ? savingCopy : saveState === "saved" ? savedCopy : saveState === "error" ? saveErrorCopy : saveCopy}
          </button>
          <button type="button" onClick={onContinueReview} disabled={!canContinueReview}>
            <MessageSquareMore size={16} aria-hidden />
            {canContinueReview
              ? language === "en"
                ? "Continue review"
                : "Continuar revision"
              : language === "en"
                ? "Review complete"
                : "Revision completa"}
          </button>
          <button type="button" onClick={onDashboard}>
            <LayoutDashboard size={16} aria-hidden />
            {language === "en" ? "Dashboard" : "Panel"}
          </button>
          <button type="button" onClick={onStartNewCheck}>
            <RotateCcw size={16} aria-hidden />
            {language === "en" ? "Start new check" : "Nuevo chequeo"}
          </button>
        </nav>
      </main>
    </section>
  );
}

function ReviewFact({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function reportBodyAreas(caseGraph: CaseGraph, language: Language) {
  const labels = [
    ...caseGraph.bodyFindings.map((finding) => formatBodyFinding(finding, language)),
    ...caseGraph.bodyRegions.map((selection) => selection.label || regionLabels[language][selection.region]),
  ];
  return Array.from(new Set(labels)).slice(0, 3).join(", ") || (language === "en" ? "Not selected" : "Sin seleccionar");
}

function reportIntensity(caseGraph: CaseGraph, language: Language) {
  const severity =
    caseGraph.bodyFindings.find((finding) => typeof finding.severity === "number")?.severity ??
    caseGraph.symptoms.find((symptom) => typeof symptom.severity === "number")?.severity ??
    caseGraph.bodyRegions.find((selection) => typeof selection.severity === "number")?.severity;
  return typeof severity === "number" ? `${severity}/10` : language === "en" ? "Not set" : "Sin dato";
}

function reportTiming(caseGraph: CaseGraph, language: Language) {
  const usefulTimeline = caseGraph.timeline.find((event) => !/^Answer \d+|Respuesta \d+/i.test(event.label));
  return usefulTimeline?.label ?? caseGraph.timeline[0]?.label ?? (language === "en" ? "Not set" : "Sin dato");
}

function reportWarnings(caseGraph: CaseGraph, language: Language) {
  if (caseGraph.redFlags.length) return caseGraph.redFlags.map((flag) => flag.label).slice(0, 2).join(", ");
  const denied = caseGraph.relevantNegatives.find((item) => /warning|red flag|denied|niega|alarma/i.test(item));
  return denied ?? (language === "en" ? "No listed warning signs selected" : "Sin senales de alarma seleccionadas");
}

function reportMedicine(caseGraph: CaseGraph, language: Language) {
  const parts = [...caseGraph.medications, ...caseGraph.allergies].slice(0, 2);
  return parts.join(", ") || (language === "en" ? "Not added" : "Sin agregar");
}

function safetyLabel(level: "none" | "urgent" | "emergency", language: Language) {
  const labels = {
    en: {
      none: "No urgent signs",
      urgent: "Get care soon",
      emergency: "Get emergency help now",
    },
    es: {
      none: "Sin senales urgentes",
      urgent: "Busca atencion pronto",
      emergency: "Busca ayuda de emergencia ahora",
    },
  };
  return labels[language][level];
}

function safetyDescription(level: "none" | "urgent" | "emergency", language: Language) {
  const descriptions = {
    en: {
      none: "No emergency warning signs in your answers right now.",
      urgent: "Your answers include signs that should be checked soon.",
      emergency: "Your answers include warning signs that need immediate help.",
    },
    es: {
      none: "Tus respuestas no muestran senales de emergencia ahora.",
      urgent: "Tus respuestas incluyen senales que conviene revisar pronto.",
      emergency: "Tus respuestas incluyen senales que necesitan ayuda inmediata.",
    },
  };
  return descriptions[language][level];
}
