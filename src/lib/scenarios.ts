import type { BodyRegion, CaseGraph, Language } from "./types";
import { regionLabels } from "./i18n";

type ScenarioCopy = {
  title: string;
  subtitle: string;
  chiefConcern: string;
  symptoms: Array<{
    region?: BodyRegion;
    label: string;
    severity?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    duration?: string;
    notes?: string;
  }>;
  timeline: Array<{ time: string; label: string }>;
  positives: string[];
  negatives: string[];
  missing: string[];
  how: string[];
};

export type TeachingScenario = {
  id: string;
  accent: "red" | "orange" | "teal" | "blue";
  primaryRegion: BodyRegion;
  en: ScenarioCopy;
  es: ScenarioCopy;
  sources: Array<{ label: string; url: string }>;
};

export const teachingScenarios: TeachingScenario[] = [
  {
    id: "serena-pe",
    accent: "red",
    primaryRegion: "chest",
    en: {
      title: "Serena Williams: postpartum clot warning",
      subtitle: "Publicly reported pulmonary embolism after childbirth",
      chiefConcern: "Inspired teaching case: postpartum shortness of breath with clot history",
      symptoms: [
        {
          region: "chest",
          label: "Shortness of breath after recent C-section",
          severity: 8,
          duration: "Sudden onset",
          notes: "Public reporting described prior clot history and postpartum concern.",
        },
      ],
      timeline: [
        { time: "Day 0", label: "Emergency C-section in public reporting" },
        { time: "Day 1", label: "Shortness of breath raised concern for pulmonary embolism" },
      ],
      positives: ["Recent surgery/postpartum period", "History of blood clots", "Breathing symptom"],
      negatives: ["No diagnosis is made by this demo"],
      missing: ["Oxygen level", "Heart rate", "Leg pain/swelling", "Chest pain", "Current anticoagulants"],
      how: [
        "Surfaces breathing difficulty as an emergency-level signal.",
        "Keeps risk factors visible instead of buried in chat.",
        "Creates a concise handoff summary for clinicians.",
      ],
    },
    es: {
      title: "Serena Williams: alerta de coágulo posparto",
      subtitle: "Embolia pulmonar reportada públicamente después del parto",
      chiefConcern: "Caso didáctico inspirado: falta de aire posparto con antecedente de coágulos",
      symptoms: [
        {
          region: "chest",
          label: "Falta de aire después de cesárea reciente",
          severity: 8,
          duration: "Inicio súbito",
          notes: "Reportes públicos describen antecedente de coágulos y preocupación posparto.",
        },
      ],
      timeline: [
        { time: "Día 0", label: "Cesárea de emergencia según reportes públicos" },
        { time: "Día 1", label: "Falta de aire generó preocupación por embolia pulmonar" },
      ],
      positives: ["Periodo posparto/cirugía reciente", "Antecedente de coágulos", "Síntoma respiratorio"],
      negatives: ["Este demo no establece diagnóstico"],
      missing: ["Oxigenación", "Frecuencia cardiaca", "Dolor/hinchazón de pierna", "Dolor de pecho", "Anticoagulantes actuales"],
      how: [
        "Marca la dificultad respiratoria como señal de emergencia.",
        "Mantiene visibles los factores de riesgo en vez de enterrarlos en el chat.",
        "Genera un resumen claro para entregar al personal clínico.",
      ],
    },
    sources: [
      {
        label: "Vogue profile",
        url: "https://www.vogue.com/article/serena-williams-vogue-cover-interview-february-2018",
      },
      {
        label: "Harvard Health on pulmonary embolism",
        url: "https://www.health.harvard.edu/blog/if-pulmonary-embolism-can-strike-serena-williams-it-can-ace-anyone-201103031624",
      },
    ],
  },
  {
    id: "libby-zion",
    accent: "orange",
    primaryRegion: "head",
    en: {
      title: "Libby Zion: medication-safety lesson",
      subtitle: "A case tied to resident supervision and duty-hour reform",
      chiefConcern: "Inspired teaching case: fever, agitation, abnormal movements, and medication-risk review",
      symptoms: [
        {
          region: "head",
          label: "Fever with agitation and abnormal movements",
          severity: 8,
          duration: "Emergency department presentation",
          notes: "Use as a medication-reconciliation and escalation teaching case.",
        },
      ],
      timeline: [
        { time: "Arrival", label: "Fever and neurologic/behavioral symptoms documented in public summaries" },
        { time: "Care team", label: "Case later shaped conversations about supervision and resident work hours" },
      ],
      positives: ["Fever", "Agitation", "Abnormal movements", "Medication interaction risk"],
      negatives: ["No individual treatment advice in this demo"],
      missing: ["Medication list", "Recent dose changes", "Temperature", "Mental status", "Care-team escalation"],
      how: [
        "Forces medication history into the case graph.",
        "Highlights fever plus altered behavior as an urgent pattern.",
        "Creates a handoff that can reduce lost context between teams.",
      ],
    },
    es: {
      title: "Libby Zion: lección de seguridad farmacológica",
      subtitle: "Caso relacionado con supervisión médica y límites de guardias",
      chiefConcern: "Caso didáctico inspirado: fiebre, agitación, movimientos anormales y revisión de medicamentos",
      symptoms: [
        {
          region: "head",
          label: "Fiebre con agitación y movimientos anormales",
          severity: 8,
          duration: "Presentación en urgencias",
          notes: "Úsalo como caso didáctico de conciliación de medicamentos y escalamiento.",
        },
      ],
      timeline: [
        { time: "Ingreso", label: "Fiebre y síntomas neurológicos/conductuales en resúmenes públicos" },
        { time: "Equipo", label: "El caso influyó en debates sobre supervisión y horas de residentes" },
      ],
      positives: ["Fiebre", "Agitación", "Movimientos anormales", "Riesgo de interacción farmacológica"],
      negatives: ["Este demo no da tratamiento individual"],
      missing: ["Lista de medicamentos", "Cambios recientes de dosis", "Temperatura", "Estado mental", "Escalamiento del equipo"],
      how: [
        "Obliga a documentar medicamentos dentro del grafo del caso.",
        "Resalta fiebre más conducta alterada como patrón urgente.",
        "Genera un resumen que reduce pérdida de contexto entre equipos.",
      ],
    },
    sources: [
      {
        label: "NCBI Bookshelf on resident hours",
        url: "https://www.ncbi.nlm.nih.gov/books/NBK214940/",
      },
      {
        label: "BMC Medical Education duty-hours history",
        url: "https://link.springer.com/article/10.1186/1472-6920-14-S1-S1",
      },
    ],
  },
  {
    id: "broad-street",
    accent: "teal",
    primaryRegion: "abdomen",
    en: {
      title: "John Snow: Broad Street cholera outbreak",
      subtitle: "A public-health pattern recognition classic",
      chiefConcern: "Inspired teaching case: severe diarrhea cluster linked to shared water exposure",
      symptoms: [
        {
          region: "abdomen",
          label: "Watery diarrhea and dehydration concern in a cluster",
          severity: 7,
          duration: "Outbreak pattern",
          notes: "Shows how geography, timeline, and exposure history change the case.",
        },
      ],
      timeline: [
        { time: "1854", label: "Cholera cases clustered around Broad Street in London" },
        { time: "Investigation", label: "Water-pump exposure became a key public-health clue" },
      ],
      positives: ["GI symptoms", "Shared exposure", "Cluster pattern"],
      negatives: ["Not an individual diagnosis workflow"],
      missing: ["Fluid status", "Exposure map", "Other affected contacts", "Water/food sources"],
      how: [
        "Turns scattered symptoms into a timeline and exposure map.",
        "Makes public-health clues visible early.",
        "Supports escalation from individual case to cluster investigation.",
      ],
    },
    es: {
      title: "John Snow: brote de cólera de Broad Street",
      subtitle: "Clásico de reconocimiento de patrones en salud pública",
      chiefConcern: "Caso didáctico inspirado: diarrea severa en grupo vinculada a exposición común al agua",
      symptoms: [
        {
          region: "abdomen",
          label: "Diarrea acuosa y preocupación por deshidratación en un grupo",
          severity: 7,
          duration: "Patrón de brote",
          notes: "Muestra cómo geografía, cronología y exposición cambian el caso.",
        },
      ],
      timeline: [
        { time: "1854", label: "Casos de cólera agrupados alrededor de Broad Street en Londres" },
        { time: "Investigación", label: "La exposición a una bomba de agua fue una pista clave" },
      ],
      positives: ["Síntomas gastrointestinales", "Exposición compartida", "Patrón de agrupamiento"],
      negatives: ["No es flujo de diagnóstico individual"],
      missing: ["Estado de hidratación", "Mapa de exposición", "Otros contactos afectados", "Fuentes de agua/comida"],
      how: [
        "Convierte síntomas dispersos en cronología y mapa de exposición.",
        "Hace visibles temprano las pistas de salud pública.",
        "Ayuda a escalar de caso individual a investigación de brote.",
      ],
    },
    sources: [
      {
        label: "CDC MMWR: John Snow and the pump handle",
        url: "https://www.cdc.gov/mmwr/preview/mmwrhtml/mm5334a1.htm",
      },
      {
        label: "AMA Journal of Ethics",
        url: "https://journalofethics.ama-assn.org/article/lesson-john-snow-and-broad-street-pump/2009-06",
      },
    ],
  },
  {
    id: "bob-harper",
    accent: "red",
    primaryRegion: "chest",
    en: {
      title: "Bob Harper: heart-attack awareness",
      subtitle: "Public story about a heart attack at 52",
      chiefConcern: "Inspired teaching case: possible cardiac emergency despite high fitness",
      symptoms: [
        {
          region: "chest",
          label: "Chest pressure and collapse risk during activity",
          severity: 9,
          duration: "Sudden",
          notes: "Use to teach that fitness does not eliminate cardiac risk.",
        },
      ],
      timeline: [
        { time: "Before", label: "Physically active adult with public heart-attack story" },
        { time: "Event", label: "Cardiac emergency required immediate response" },
      ],
      positives: ["Chest-pressure pattern", "Potential collapse", "Need for emergency response"],
      negatives: ["No personal risk scoring in this demo"],
      missing: ["Chest pain details", "Shortness of breath", "Sweating", "Family history", "AED/EMS response"],
      how: [
        "Prevents reassurance based only on appearance or fitness.",
        "Escalates chest-pressure language immediately.",
        "Prompts for family history and emergency-response context.",
      ],
    },
    es: {
      title: "Bob Harper: conciencia sobre infarto",
      subtitle: "Historia pública de un infarto a los 52 años",
      chiefConcern: "Caso didáctico inspirado: posible emergencia cardiaca aun con alta condición física",
      symptoms: [
        {
          region: "chest",
          label: "Opresión en el pecho y riesgo de colapso durante actividad",
          severity: 9,
          duration: "Súbito",
          notes: "Sirve para enseñar que estar en forma no elimina el riesgo cardiaco.",
        },
      ],
      timeline: [
        { time: "Antes", label: "Adulto físicamente activo con historia pública de infarto" },
        { time: "Evento", label: "Emergencia cardiaca requirió respuesta inmediata" },
      ],
      positives: ["Patrón de opresión en pecho", "Posible colapso", "Necesidad de respuesta de emergencia"],
      negatives: ["Este demo no calcula riesgo personal"],
      missing: ["Detalles del dolor", "Falta de aire", "Sudoración", "Historia familiar", "Respuesta con DEA/EMS"],
      how: [
        "Evita tranquilizarse solo por apariencia o condición física.",
        "Escala de inmediato lenguaje de opresión torácica.",
        "Pregunta por historia familiar y respuesta de emergencia.",
      ],
    },
    sources: [
      {
        label: "American Heart Association interview",
        url: "https://www.heart.org/en/health-topics/at-the-heart-of-it-with-nancy-brown/the-personal-side-of-fitness-with-bob-harper",
      },
      {
        label: "Cleveland Clinic media note",
        url: "https://newsroom.clevelandclinic.org/2017/03/09/nbc-nightly-news-reports-biggest-loser-trainer-bob-harper-following-heart-attack",
      },
    ],
  },
];

export function scenarioToCaseGraph(scenario: TeachingScenario, language: Language): CaseGraph {
  const copy = scenario[language];
  return {
    mode: "demo",
    language,
    checkStatus: "review-ready",
    questionCount: 0,
    currentQuestion:
      language === "en"
        ? "What detail would most change the safety level in this teaching case?"
        : "¿Qué dato cambiaría más el nivel de seguridad en este caso didáctico?",
    scenarioId: scenario.id,
    scenarioTitle: copy.title,
    chiefConcern: copy.chiefConcern,
    userNarrative: copy.chiefConcern,
    medicalHistory: copy.positives.filter((item) => /history|antecedente|postpartum|posparto|surgery|cirugía/i.test(item)),
    medications: [],
    allergies: [],
    bodyRegions: [{ region: scenario.primaryRegion, label: copyForRegion(scenario.primaryRegion, language), severity: copy.symptoms[0]?.severity }],
    bodyFindings: [],
    symptoms: copy.symptoms.map((symptom, index) => ({
      ...symptom,
      id: `${scenario.id}-symptom-${index}`,
    })),
    timeline: copy.timeline.map((event, index) => ({
      ...event,
      id: `${scenario.id}-timeline-${index}`,
    })),
    relevantPositives: copy.positives,
    relevantNegatives: copy.negatives,
    missingInfo: copy.missing,
    redFlags: [],
    howAppHelps: copy.how,
    sources: scenario.sources,
  };
}

function copyForRegion(region: BodyRegion, language: Language) {
  return regionLabels[language][region];
}
