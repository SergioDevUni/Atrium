"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Cigarette, Dna, HeartPulse, ShieldAlert, Skull, Sparkles, Stethoscope } from "lucide-react";
import {
  HEREDITARY_SUMMARY,
  PEDIGREE_BY_ID,
  PEDIGREE_FAMILY,
  PEDIGREE_POSITIONS,
  PEDIGREE_SEVERITY_META,
  PEDIGREE_STAGE,
  getPedigreeStats,
  type PedigreePerson,
  type PedigreeSeverity,
  type PedigreeSex,
} from "@/lib/condition-tree";
import type { CaseGraph, Language } from "@/lib/types";

type ConditionTreeViewProps = {
  language: Language;
  currentCase: CaseGraph;
  onNewCheck: () => void;
  onDashboard: () => void;
};

const copy = {
  en: {
    eyebrow: "Pedigree · Atrium Clinic",
    title: "Hereditary Condition Tree",
    subtitle:
      "Original Atrium tree for respiratory and atopic conditions across four generations. It helps review family patterns without turning the app into a diagnosis engine.",
    source: "Original Atrium source",
    currentContext: "Current check context",
    noSignals: "No active symptom context yet. You can still review the inherited condition map.",
    reviewOnly: "Review support only",
    reviewOnlyCopy:
      "This tree organizes a fictional teaching record. It can support clinical discussion, but it does not confirm what any user has.",
    newCheck: "Start New Check",
    dashboard: "Open Dashboard",
    patient: "Index case",
    diagnosis: "Teaching diagnosis",
    pattern: "Pattern",
    penetrance: "Penetrance",
    inheritedFrom: "Likely inheritance line",
    generations: "Generations",
    clinicalAsthma: "Clinical asthma",
    atopicPhenotype: "Atopic phenotype",
    subclinical: "Subclinical",
    smokingHistory: "Smoking context",
    legend: "Legend",
    smoker: "Smoking",
    deceased: "Deceased",
    proband: "Index case",
    detailTitle: "Selected family member",
    generation: "Generation",
    born: "Birth",
    died: "Death",
    age: "Age",
    sex: "Sex",
    status: "Status",
    causeOfDeath: "Cause of death",
    respiratory: "Respiratory conditions",
    atopy: "Atopy / allergies",
    noRespiratory: "No respiratory condition listed.",
    notes: "Clinical note",
    genetic: "Genetic relevance",
    genes: "Suspected candidate genes",
    male: "Male",
    female: "Female",
    alive: "Alive",
    longTermCare: "Long-term care",
    generationLabels: ["G1 · Grandparents", "G2 · Parents", "G3 · Patient and siblings", "G4 · Children and niece"],
  },
  es: {
    eyebrow: "Pedigrí · Atrium Clinic",
    title: "Árbol heredofamiliar",
    subtitle:
      "Árbol original de Atrium para condiciones respiratorias y atópicas en cuatro generaciones. Ayuda a revisar patrones familiares sin convertir la app en un motor de diagnóstico.",
    source: "Fuente original Atrium",
    currentContext: "Contexto del chequeo actual",
    noSignals: "Aún no hay contexto activo de síntomas. Igual puedes revisar el mapa heredofamiliar.",
    reviewOnly: "Solo apoyo para revisión",
    reviewOnlyCopy:
      "Este árbol organiza un expediente ficticio de enseñanza. Puede apoyar la conversación clínica, pero no confirma lo que tiene un usuario.",
    newCheck: "Iniciar nuevo chequeo",
    dashboard: "Abrir panel",
    patient: "Caso índice",
    diagnosis: "Diagnóstico de enseñanza",
    pattern: "Patrón",
    penetrance: "Penetrancia",
    inheritedFrom: "Línea probable de herencia",
    generations: "Generaciones",
    clinicalAsthma: "Asma clínica",
    atopicPhenotype: "Fenotipo atópico",
    subclinical: "Subclínico",
    smokingHistory: "Contexto tabaco",
    legend: "Leyenda",
    smoker: "Tabaquismo",
    deceased: "Fallecido",
    proband: "Caso índice",
    detailTitle: "Familiar seleccionado",
    generation: "Generación",
    born: "Nacimiento",
    died: "Fallecimiento",
    age: "Edad",
    sex: "Sexo",
    status: "Estado",
    causeOfDeath: "Causa de fallecimiento",
    respiratory: "Condiciones respiratorias",
    atopy: "Atopia / alergias",
    noRespiratory: "Sin condición respiratoria registrada.",
    notes: "Nota clínica",
    genetic: "Relevancia genética",
    genes: "Genes candidatos sospechados",
    male: "Masculino",
    female: "Femenino",
    alive: "Vivo",
    longTermCare: "Asilo",
    generationLabels: ["G1 · Abuelos", "G2 · Padres", "G3 · Paciente y hermanos", "G4 · Hijos y sobrina"],
  },
} satisfies Record<Language, Record<string, string | string[]>>;

export function ConditionTreeView({ language, currentCase, onNewCheck, onDashboard }: ConditionTreeViewProps) {
  const [selectedId, setSelectedId] = useState("g3_paciente");
  const selected = PEDIGREE_BY_ID[selectedId] ?? PEDIGREE_BY_ID.g3_paciente;
  const t = copy[language];
  const stats = useMemo(() => getPedigreeStats(), []);
  const currentSignals = useMemo(() => buildCurrentSignals(currentCase), [currentCase]);

  return (
    <section className="condition-tree-view pedigree-tree-view" aria-labelledby="condition-tree-title">
      <header className="condition-tree-hero pedigree-tree-hero">
        <div className="condition-tree-hero-copy">
          <p>{t.eyebrow}</p>
          <h1 id="condition-tree-title">{t.title}</h1>
          <span>{t.subtitle}</span>
          <div className="condition-tree-actions" aria-label="Condition tree actions">
            <button className="primary" type="button" onClick={onNewCheck}>
              <Stethoscope size={16} aria-hidden />
              {t.newCheck}
            </button>
            <button className="ghost" type="button" onClick={onDashboard}>
              {t.dashboard}
              <ArrowRight size={15} aria-hidden />
            </button>
          </div>
        </div>

        <aside className="condition-tree-context" aria-label={String(t.currentContext)}>
          <div className="condition-tree-context-head">
            <Dna size={18} aria-hidden />
            <strong>{t.currentContext}</strong>
          </div>
          <div className="condition-tree-signal-list">
            {currentSignals.length ? currentSignals.map((signal) => <span key={signal}>{signal}</span>) : <span>{t.noSignals}</span>}
          </div>
          <div className="condition-tree-boundary">
            <ShieldAlert size={17} aria-hidden />
            <div>
              <strong>{t.reviewOnly}</strong>
              <p>{t.reviewOnlyCopy}</p>
            </div>
          </div>
        </aside>
      </header>

      <div className="pedigree-layout">
        <div className="pedigree-stage-shell">
          <div className="pedigree-stage-scroll" aria-label="Interactive hereditary condition tree">
            <div className="pedigree-stage" style={{ width: PEDIGREE_STAGE.width, height: PEDIGREE_STAGE.height }}>
              <PedigreeLines />

              {(t.generationLabels as string[]).map((label, index) => (
                <div
                  key={label}
                  className="pedigree-generation-label"
                  style={{ top: [74, 254, 434, 614][index] }}
                >
                  {label}
                </div>
              ))}

              {PEDIGREE_FAMILY.map((person) => (
                <PersonNode
                  key={person.id}
                  person={person}
                  language={language}
                  active={person.id === selected.id}
                  onClick={() => setSelectedId(person.id)}
                />
              ))}
            </div>
          </div>

          <div className="pedigree-legend" aria-label={String(t.legend)}>
            {(["asma_clinica", "atopia", "subclinico", "ninguno"] as PedigreeSeverity[]).map((severity) => (
              <div key={severity} className="pedigree-legend-item">
                <span className={`pedigree-dot pedigree-dot-${PEDIGREE_SEVERITY_META[severity].tone}`} />
                <span>{PEDIGREE_SEVERITY_META[severity].label[language]}</span>
              </div>
            ))}
            <div className="pedigree-legend-item">
              <Cigarette size={14} aria-hidden />
              <span>{t.smoker}</span>
            </div>
            <div className="pedigree-legend-item">
              <Skull size={14} aria-hidden />
              <span>{t.deceased}</span>
            </div>
            <div className="pedigree-legend-item pedigree-legend-proband">
              <Sparkles size={14} aria-hidden />
              <span>{t.proband}</span>
            </div>
          </div>
        </div>

        <DetailPanel person={selected} language={language} />
      </div>

      <div className="pedigree-tree-summary" aria-label="Hereditary summary">
        <SummaryCard label={String(t.patient)} value={HEREDITARY_SUMMARY.patient} />
        <SummaryCard label={String(t.diagnosis)} value={HEREDITARY_SUMMARY.diagnosis} />
        <SummaryCard label={String(t.pattern)} value={HEREDITARY_SUMMARY.pattern} />
        <SummaryCard label={String(t.penetrance)} value={HEREDITARY_SUMMARY.penetrance} />
        <SummaryCard label={String(t.inheritedFrom)} value={HEREDITARY_SUMMARY.inheritedFrom} wide />
      </div>

      <div className="pedigree-stats" aria-label="Pedigree statistics">
        <StatCard label={String(t.generations)} value={String(stats.generations)} />
        <StatCard label={String(t.clinicalAsthma)} value={String(stats.clinicalAsthma)} tone="rose" />
        <StatCard label={String(t.atopicPhenotype)} value={String(stats.atopicPhenotype)} tone="amber" />
        <StatCard label={String(t.subclinical)} value={String(stats.subclinical)} tone="sky" />
        <StatCard label={String(t.smokingHistory)} value={String(stats.smokingHistory)} />
      </div>
    </section>
  );
}

function PedigreeLines() {
  const { width, height } = PEDIGREE_STAGE;

  return (
    <svg width={width} height={height} className="pedigree-relationship-lines" aria-hidden>
      <g className="pedigree-couple-lines" fill="none">
        <path d="M 172 74 L 210 74" />
        <path d="M 1032 74 L 1070 74" />
        <path d="M 577 254 L 605 254" />
      </g>
      <g className="pedigree-descendant-lines" fill="none">
        <path d="M 191 74 L 191 164 L 511 164 L 511 200" />
        <path d="M 1051 74 L 1051 164 L 671 164 L 671 200" />
        <path d="M 591 254 L 591 344" />
        <path d="M 376 344 L 806 344" />
        <path d="M 376 344 L 376 380" />
        <path d="M 591 344 L 591 380" />
        <path d="M 806 344 L 806 380" />
        <path d="M 376 488 L 376 560" />
        <path d="M 591 488 L 591 524" />
        <path d="M 516 524 L 666 524" />
        <path d="M 516 524 L 516 560" />
        <path d="M 666 524 L 666 560" />
      </g>
      <g className="pedigree-join-dots">
        <circle cx={376} cy={344} r={2.6} />
        <circle cx={591} cy={344} r={2.6} />
        <circle cx={806} cy={344} r={2.6} />
        <circle cx={516} cy={524} r={2.6} />
        <circle cx={666} cy={524} r={2.6} />
        <circle cx={511} cy={164} r={2.6} />
        <circle cx={671} cy={164} r={2.6} />
      </g>
    </svg>
  );
}

function PersonNode({
  person,
  language,
  active,
  onClick,
}: {
  person: PedigreePerson;
  language: Language;
  active: boolean;
  onClick: () => void;
}) {
  const pos = PEDIGREE_POSITIONS[person.id];
  const meta = PEDIGREE_SEVERITY_META[person.severity];
  const deceased = person.status === "fallecido";

  return (
    <button
      className={`pedigree-node severity-${person.severity} ${active ? "active" : ""} ${person.isProband ? "proband" : ""}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: PEDIGREE_STAGE.nodeWidth,
        height: PEDIGREE_STAGE.nodeHeight,
      }}
      type="button"
      onClick={onClick}
    >
      <div className="pedigree-node-head">
        <div>
          <SexBadge sex={person.sex} />
          {person.isProband && <span className="pedigree-index-badge">{copy[language].proband}</span>}
        </div>
        <span className="pedigree-status-icons">
          {person.smoker && <Cigarette size={13} aria-label={String(copy[language].smoker)} />}
          {deceased && <Skull size={13} aria-label={String(copy[language].deceased)} />}
        </span>
      </div>
      <strong className="pedigree-node-name">{person.shortName ?? person.name.split(" ")[0]}</strong>
      <span className="pedigree-node-years">
        {person.bornYear}
        {deceased ? `-${person.diedYear}` : person.age ? ` · ${person.age}a` : ""}
      </span>
      <span className="pedigree-node-severity">
        <span className={`pedigree-dot pedigree-dot-${meta.tone}`} />
        {meta.label[language]}
      </span>
    </button>
  );
}

function DetailPanel({ person, language }: { person: PedigreePerson; language: Language }) {
  const t = copy[language];
  const meta = PEDIGREE_SEVERITY_META[person.severity];

  return (
    <aside className="pedigree-detail" aria-label={String(t.detailTitle)}>
      <div className="pedigree-detail-head">
        <span>{t.detailTitle}</span>
        <h2>{person.name}</h2>
        <div className="pedigree-badges">
          <span className={`pedigree-badge pedigree-badge-${meta.tone}`}>{meta.label[language]}</span>
          {person.isProband && <span className="pedigree-badge pedigree-badge-proband">{t.proband}</span>}
          {person.smoker && (
            <span className="pedigree-badge">
              <Cigarette size={12} aria-hidden />
              {t.smoker}
            </span>
          )}
        </div>
      </div>

      <div className="pedigree-stat-grid">
        <DetailStat label={String(t.generation)} value={String(person.generation)} />
        <DetailStat label={String(t.born)} value={String(person.bornYear)} />
        {person.diedYear ? <DetailStat label={String(t.died)} value={String(person.diedYear)} tone="rose" /> : <DetailStat label={String(t.age)} value={person.age ? `${person.age}` : "-"} />}
        <DetailStat label={String(t.sex)} value={person.sex === "M" ? String(t.male) : String(t.female)} />
        <DetailStat label={String(t.status)} value={formatStatus(person.status, language)} />
      </div>

      {person.causeOfDeath && (
        <DetailSection title={String(t.causeOfDeath)} icon={<Skull size={14} aria-hidden />}>
          <p>{person.causeOfDeath}</p>
        </DetailSection>
      )}

      <DetailSection title={String(t.respiratory)} icon={<HeartPulse size={14} aria-hidden />}>
        {person.conditions.length ? <DetailList items={person.conditions} tone="orange" /> : <p>{t.noRespiratory}</p>}
      </DetailSection>

      {person.atopicConditions?.length ? (
        <DetailSection title={String(t.atopy)} icon={<Sparkles size={14} aria-hidden />}>
          <DetailList items={person.atopicConditions} tone="amber" />
        </DetailSection>
      ) : null}

      {person.notes && (
        <DetailSection title={String(t.notes)}>
          <p>{person.notes}</p>
        </DetailSection>
      )}

      {person.geneticRelevance && (
        <DetailSection title={String(t.genetic)} icon={<Dna size={14} aria-hidden />}>
          <div className="pedigree-genetic-note">{person.geneticRelevance}</div>
        </DetailSection>
      )}

      {person.isProband && (
        <DetailSection title={String(t.genes)} icon={<AlertTriangle size={14} aria-hidden />}>
          <div className="pedigree-gene-list">
            {HEREDITARY_SUMMARY.candidateGenes.map((gene) => (
              <article key={gene.gene} className="pedigree-gene-card">
                <strong>{gene.gene}</strong>
                <span>{gene.role}</span>
              </article>
            ))}
          </div>
        </DetailSection>
      )}
    </aside>
  );
}

function SexBadge({ sex }: { sex: PedigreeSex }) {
  return <span className={`pedigree-sex pedigree-sex-${sex.toLowerCase()}`}>{sex}</span>;
}

function SummaryCard({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <article className={`pedigree-summary-card ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "rose" | "amber" | "sky" }) {
  return (
    <article className={`pedigree-stat-card ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DetailStat({ label, value, tone }: { label: string; value: string; tone?: "rose" }) {
  return (
    <article className={`pedigree-detail-stat ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="pedigree-section">
      <h3>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailList({ items, tone }: { items: string[]; tone: "orange" | "amber" }) {
  return (
    <ul className={`pedigree-list pedigree-list-${tone}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function buildCurrentSignals(caseGraph: CaseGraph) {
  const bodyAreas = caseGraph.bodyFindings.map((finding) => finding.region);
  const symptomLabels = caseGraph.symptoms.map((symptom) => symptom.label);
  const narrative = caseGraph.userNarrative || caseGraph.chiefConcern;

  return Array.from(new Set([...bodyAreas, ...symptomLabels, narrative].filter(Boolean) as string[])).slice(0, 5);
}

function formatStatus(status: PedigreePerson["status"], language: Language) {
  if (status === "fallecido") {
    return String(copy[language].deceased);
  }

  if (status === "asilo") {
    return String(copy[language].longTermCare);
  }

  return String(copy[language].alive);
}
