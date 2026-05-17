export type PedigreeSex = "M" | "F";
export type PedigreeSeverity = "asma_clinica" | "atopia" | "subclinico" | "ninguno";
export type PedigreeStatus = "vivo" | "fallecido" | "asilo";

export type PedigreePerson = {
  id: string;
  name: string;
  shortName?: string;
  sex: PedigreeSex;
  generation: 1 | 2 | 3 | 4;
  bornYear: number;
  diedYear?: number;
  age?: number;
  status?: PedigreeStatus;
  causeOfDeath?: string;
  isProband?: boolean;
  smoker?: boolean;
  conditions: string[];
  atopicConditions?: string[];
  severity: PedigreeSeverity;
  notes?: string;
  geneticRelevance?: string;
  parentIds?: string[];
  partnerId?: string;
};

export type PedigreePosition = {
  x: number;
  y: number;
};

export const PEDIGREE_STAGE = {
  width: 1240,
  height: 700,
  nodeWidth: 132,
  nodeHeight: 108,
} as const;

export const PEDIGREE_POSITIONS: Record<string, PedigreePosition> = {
  g1_pat_abuelo: { x: 40, y: 20 },
  g1_pat_abuela: { x: 210, y: 20 },
  g1_mat_abuelo: { x: 900, y: 20 },
  g1_mat_abuela: { x: 1070, y: 20 },
  g2_padre: { x: 445, y: 200 },
  g2_madre: { x: 605, y: 200 },
  g3_hermana: { x: 310, y: 380 },
  g3_paciente: { x: 525, y: 380 },
  g3_hermano: { x: 740, y: 380 },
  g4_sobrina: { x: 310, y: 560 },
  g4_hijo1: { x: 450, y: 560 },
  g4_hijo2: { x: 600, y: 560 },
};

export const PEDIGREE_FAMILY: PedigreePerson[] = [
  {
    id: "g1_pat_abuelo",
    name: "Roberto Mendoza Herrera",
    shortName: "Roberto",
    sex: "M",
    generation: 1,
    bornYear: 1930,
    diedYear: 2008,
    status: "fallecido",
    causeOfDeath: "EPOC + insuficiencia cardiaca",
    smoker: true,
    conditions: ["EPOC (40 paq./año)", "Enfisema pulmonar"],
    severity: "atopia",
    geneticRelevance:
      "Probable asma subyacente enmascarada por tabaquismo severo. Posible transmisor del componente genético por rama paterna.",
    partnerId: "g1_pat_abuela",
  },
  {
    id: "g1_pat_abuela",
    name: "Carmen Flores de Mendoza",
    shortName: "Carmen",
    sex: "F",
    generation: 1,
    bornYear: 1933,
    diedYear: 2015,
    status: "fallecido",
    causeOfDeath: "Infarto agudo al miocardio",
    conditions: ["Rinitis alérgica perenne", "Sibilancias estacionales"],
    atopicConditions: ["Eccema en manos"],
    severity: "atopia",
    geneticRelevance:
      "Alta. Rinitis alérgica y sibilancias estacionales sugieren fenotipo atópico transmitido. Probable portadora de variantes en IL-4/IL-13.",
    partnerId: "g1_pat_abuelo",
  },
  {
    id: "g1_mat_abuelo",
    name: "Jesús Ríos Castillo",
    shortName: "Jesús",
    sex: "M",
    generation: 1,
    bornYear: 1935,
    diedYear: 2010,
    status: "fallecido",
    causeOfDeath: "Cáncer de pulmón",
    smoker: true,
    conditions: ["Bronquitis crónica"],
    severity: "ninguno",
    geneticRelevance: "Baja para asma específicamente. Posible contribución a hiperreactividad bronquial general.",
    partnerId: "g1_mat_abuela",
  },
  {
    id: "g1_mat_abuela",
    name: "Esperanza Salinas de Ríos",
    shortName: "Esperanza",
    sex: "F",
    generation: 1,
    bornYear: 1937,
    age: 89,
    status: "asilo",
    conditions: ["Asma bronquial (Dx 35a)"],
    atopicConditions: ["Urticaria crónica", "Alergia a mariscos"],
    severity: "asma_clinica",
    geneticRelevance:
      "Muy alta. Asma diagnosticada + urticaria + alergia alimentaria = fenotipo atópico completo. Principal fuente del componente genético por rama materna. Probable portadora de variantes ORMDL3 y HLA-DQ.",
    partnerId: "g1_mat_abuelo",
  },
  {
    id: "g2_padre",
    name: "Miguel Ángel Mendoza Flores",
    shortName: "Miguel",
    sex: "M",
    generation: 2,
    bornYear: 1962,
    age: 64,
    status: "vivo",
    smoker: false,
    conditions: ["Asma leve intermitente (Dx 15a)", "Rinitis alérgica"],
    atopicConditions: ["Alergia a Penicilina"],
    severity: "asma_clinica",
    geneticRelevance:
      "Alta. Asma leve + rinitis + alergia a medicamento. Tabaquismo durante el embarazo de su esposa representa factor epigenético que amplificó la expresión genética en el paciente.",
    parentIds: ["g1_pat_abuelo", "g1_pat_abuela"],
    partnerId: "g2_madre",
    notes: "Exfumador 20-48a (1 cajetilla/día). Fumaba durante el embarazo de la madre.",
  },
  {
    id: "g2_madre",
    name: "Patricia Ríos de Mendoza",
    shortName: "Patricia",
    sex: "F",
    generation: 2,
    bornYear: 1965,
    age: 61,
    status: "vivo",
    conditions: ["Rinitis alérgica severa + pólipos", "Hiperreactividad bronquial subclínica"],
    atopicConditions: ["Dermatitis atópica (resuelta)", "Alergia a nueces", "Conjuntivitis alérgica"],
    severity: "atopia",
    geneticRelevance:
      "Muy alta. Portadora del fenotipo atópico completo heredado de su madre. La hiperreactividad bronquial subclínica sugiere que el umbral de expresión del asma es genéticamente determinado.",
    parentIds: ["g1_mat_abuelo", "g1_mat_abuela"],
    partnerId: "g2_padre",
  },
  {
    id: "g3_hermana",
    name: "Laura Patricia Mendoza Ríos",
    shortName: "Laura",
    sex: "F",
    generation: 3,
    bornYear: 1987,
    age: 39,
    status: "vivo",
    conditions: ["Asma leve intermitente (Dx 10a)"],
    atopicConditions: ["Rinitis estacional", "Alergia a epitelio de perro"],
    severity: "asma_clinica",
    geneticRelevance: "Confirma penetrancia del gen asmático. Expresión más leve que el paciente índice por menor exposición a cofactores.",
    parentIds: ["g2_padre", "g2_madre"],
  },
  {
    id: "g3_paciente",
    name: "Carlos Alejandro Mendoza Ríos",
    shortName: "Carlos",
    sex: "M",
    generation: 3,
    bornYear: 1990,
    age: 36,
    status: "vivo",
    isProband: true,
    conditions: ["Asma moderada persistente (Dx 7a, GINA 3-4)", "Rinitis alérgica perenne", "ERGE", "Ansiedad generalizada"],
    atopicConditions: ["Dermatitis atópica (infancia)", "Conjuntivitis alérgica", "Pólipos nasales (polipectomía 26a)"],
    severity: "asma_clinica",
    geneticRelevance:
      "Caso índice. Expresión más severa por acumulación de cofactores: tabaquismo prenatal paterno, lactancia corta, tabaquismo propio (18-24a), exposición ocupacional, ERGE.",
    parentIds: ["g2_padre", "g2_madre"],
    notes: "Exfumador 18-24a. Arquitecto con exposición a solventes/pinturas.",
  },
  {
    id: "g3_hermano",
    name: "Diego Mendoza Ríos",
    shortName: "Diego",
    sex: "M",
    generation: 3,
    bornYear: 1994,
    age: 32,
    status: "vivo",
    conditions: ["Hiperreactividad bronquial subclínica"],
    atopicConditions: ["Rinitis perenne", "Alergia a ácaros", "Eccema en manos"],
    severity: "subclinico",
    geneticRelevance:
      "Porta el componente genético pero no expresa asma clínica. Sugiere que factores ambientales (tabaquismo prenatal, exposición temprana) son determinantes de la expresión fenotípica.",
    parentIds: ["g2_padre", "g2_madre"],
  },
  {
    id: "g4_sobrina",
    name: "Sofía (hija de Laura)",
    shortName: "Sofía",
    sex: "F",
    generation: 4,
    bornYear: 2015,
    age: 11,
    status: "vivo",
    conditions: ["Sibilancias recurrentes - en estudio para asma", "Rinitis alérgica (Dx 8a)"],
    atopicConditions: ["Dermatitis atópica desde 6 meses"],
    severity: "atopia",
    geneticRelevance: "Alto riesgo de desarrollar asma. Tríada atópica en desarrollo. Vigilancia estrecha.",
    parentIds: ["g3_hermana"],
  },
  {
    id: "g4_hijo1",
    name: "Mateo Mendoza García",
    shortName: "Mateo",
    sex: "M",
    generation: 4,
    bornYear: 2018,
    age: 8,
    status: "vivo",
    conditions: ["Sibilancias recurrentes (índice predictivo positivo)", "Rinitis alérgica (Dx 6a)"],
    atopicConditions: ["Dermatitis atópica activa"],
    severity: "atopia",
    geneticRelevance: "Patrón idéntico al del padre en la misma etapa. Confirma transmisión vertical del fenotipo atópico con penetrancia alta.",
    parentIds: ["g3_paciente"],
  },
  {
    id: "g4_hijo2",
    name: "Isabella Mendoza García",
    shortName: "Isabella",
    sex: "F",
    generation: 4,
    bornYear: 2021,
    age: 5,
    status: "vivo",
    conditions: [],
    atopicConditions: ["Dermatitis atópica leve"],
    severity: "atopia",
    geneticRelevance: "Pendiente de evolución. La dermatitis atópica temprana es el primer marcador de la tríada atópica.",
    parentIds: ["g3_paciente"],
  },
];

export const PEDIGREE_BY_ID = Object.fromEntries(PEDIGREE_FAMILY.map((person) => [person.id, person])) as Record<string, PedigreePerson>;

export const HEREDITARY_SUMMARY = {
  patient: "Carlos Alejandro Mendoza Ríos · 36 años · PAC-2024-00847",
  diagnosis: "Asma bronquial moderada persistente (J45.1)",
  pattern: "Poligénica con influencia ambiental significativa",
  penetrance: "Alta para fenotipo atópico, moderada para asma clínica",
  inheritedFrom: "Línea materna principalmente (abuela materna -> madre -> paciente -> hijo Mateo)",
  candidateGenes: [
    { gene: "ORMDL3 (17q21)", role: "Regulación del retículo endoplásmico bronquial" },
    { gene: "IL-4 / IL-13", role: "Citocinas Th2 - inflamación alérgica" },
    { gene: "FLG (Filagrina)", role: "Barrera epidérmica - dermatitis atópica" },
    { gene: "HLA-DQ / HLA-DR", role: "Sensibilización IgE policlonal" },
  ],
};

export const PEDIGREE_SEVERITY_META: Record<
  PedigreeSeverity,
  {
    label: {
      en: string;
      es: string;
    };
    tone: string;
  }
> = {
  asma_clinica: {
    label: { en: "Clinical asthma", es: "Asma clínica" },
    tone: "rose",
  },
  atopia: {
    label: { en: "Atopic phenotype", es: "Fenotipo atópico" },
    tone: "amber",
  },
  subclinico: {
    label: { en: "Subclinical", es: "Subclínico" },
    tone: "sky",
  },
  ninguno: {
    label: { en: "No atopy listed", es: "Sin atopia" },
    tone: "zinc",
  },
};

export function getPedigreeStats() {
  return {
    generations: new Set(PEDIGREE_FAMILY.map((person) => person.generation)).size,
    clinicalAsthma: PEDIGREE_FAMILY.filter((person) => person.severity === "asma_clinica").length,
    atopicPhenotype: PEDIGREE_FAMILY.filter((person) => person.severity === "atopia").length,
    subclinical: PEDIGREE_FAMILY.filter((person) => person.severity === "subclinico").length,
    smokingHistory: PEDIGREE_FAMILY.filter((person) => person.smoker || person.notes?.toLowerCase().includes("fum")).length,
  };
}
