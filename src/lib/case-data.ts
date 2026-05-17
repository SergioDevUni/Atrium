import { regionLabels } from "./i18n";
import type { CaseGraph, Language } from "./types";

export function createInitialCase(language: Language): CaseGraph {
  return {
    mode: "demo",
    language,
    checkStatus: "idle",
    questionCount: 0,
    currentQuestion:
      language === "en"
        ? "What are you most concerned about today? You can answer in one sentence."
        : "¿Qué es lo que más te preocupa hoy? Puedes responder en una frase.",
    chiefConcern:
      language === "en"
        ? "Synthetic case: abdominal pain after dinner"
        : "Caso sintético: dolor abdominal después de cenar",
    bodyRegions: [{ region: "abdomen", label: regionLabels[language].abdomen, severity: 5 }],
    bodyFindings: [],
    symptoms: [
      {
        id: "sym-abdomen-pain",
        region: "abdomen",
        label: language === "en" ? "Cramping abdominal pain" : "Dolor abdominal tipo cólico",
        severity: 5,
        duration: language === "en" ? "4 hours" : "4 horas",
        notes:
          language === "en"
            ? "Started after a heavy meal; no fainting reported."
            : "Empezó después de una comida pesada; no se reporta desmayo.",
      },
    ],
    timeline: [
      {
        id: "timeline-meal",
        time: language === "en" ? "6:30 PM" : "18:30",
        label: language === "en" ? "Heavy dinner" : "Cena pesada",
      },
      {
        id: "timeline-pain",
        time: language === "en" ? "8:00 PM" : "20:00",
        label: language === "en" ? "Pain began" : "Comenzó el dolor",
      },
    ],
    userNarrative: "",
    medicalHistory: [],
    medications: [],
    allergies: [],
    relevantPositives: [
      language === "en" ? "Pain is localized to abdomen" : "Dolor localizado en abdomen",
    ],
    relevantNegatives: [
      language === "en" ? "No chest pain reported" : "No se reporta dolor de pecho",
    ],
    missingInfo:
      language === "en"
        ? ["Fever", "Vomiting", "Pregnancy status if relevant", "Last bowel movement"]
        : ["Fiebre", "Vómito", "Embarazo si aplica", "Última evacuación"],
    redFlags: [],
    howAppHelps:
      language === "en"
        ? [
            "Keeps symptoms, timeline, and missing details in one visible case graph.",
            "Runs deterministic red-flag checks before normal guidance.",
            "Produces a visit-ready summary without claiming a diagnosis.",
          ]
        : [
            "Mantiene síntomas, cronología y datos faltantes en un grafo visible.",
            "Ejecuta señales de alarma deterministas antes de la guía normal.",
            "Genera un resumen para consulta sin afirmar diagnóstico.",
          ],
  };
}
