"use client";

import { Activity, AlertTriangle, ChevronRight, Clock3, FileText, PlusCircle, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { CaseGraph, CheckDraft, CheckRecord } from "@/lib/types";

type RecordsDashboardProps = {
  t: Record<string, string>;
  history: CheckRecord[];
  draft: CheckDraft | null;
  currentCase: CaseGraph;
  importantSymptoms: string[];
  followUps: string[];
  onNewCheck: () => void;
  onOpenRecord: (record: CheckRecord) => void;
  onOpenDraft: () => void;
  onDiscardDraft: () => void;
  onDeleteRecord: (record: CheckRecord) => void;
};

export function RecordsDashboard({
  t,
  history,
  draft,
  currentCase,
  importantSymptoms,
  followUps,
  onNewCheck,
  onOpenRecord,
  onOpenDraft,
  onDiscardDraft,
  onDeleteRecord,
}: RecordsDashboardProps) {
  const isSpanish = t.dashboard === "Panel";
  const copy = dashboardCopy(isSpanish);
  const draftIsReview = Boolean(draft?.assessment);
  const draftLabel = draftIsReview ? t.reviewReady : (t.currentDraft ?? "Current draft");
  const draftActionLabel = draftIsReview ? t.openReview : t.continueCheck;
  const latestRecord = history[0] ?? null;
  const reviewCount = history.filter((record) => record.status === "reviewed" || record.assessment).length;
  const highestSafety = highestDashboardSafety([
    ...(draft ? [draft.safetyLevel] : []),
    ...history.map((record) => record.safetyLevel),
  ]);
  const signalItems = importantSymptoms.length ? importantSymptoms : [t.unknown];
  const followUpItems = (followUps.length ? followUps : currentCase.missingInfo).slice(0, 8);

  return (
    <section className="dashboard-view" aria-labelledby="dashboard-view-title">
      <div className="dashboard-view-head">
        <div>
          <p>{t.dashboard}</p>
          <h2 id="dashboard-view-title">{copy.title}</h2>
          <span>{copy.subtitle}</span>
        </div>
        <button className="primary" type="button" onClick={onNewCheck}>
          <PlusCircle size={16} aria-hidden />
          {t.newCheck}
        </button>
      </div>

      <div className="dashboard-kpis" aria-label={copy.statusOverview}>
        <DashboardKpi icon={<Clock3 size={17} aria-hidden />} label={copy.activeWork} value={draft ? draftLabel : copy.noneActive} tone={draft ? "active" : "quiet"} />
        <DashboardKpi icon={<FileText size={17} aria-hidden />} label={copy.savedReviews} value={`${reviewCount}/${history.length}`} tone="default" />
        <DashboardKpi icon={<AlertTriangle size={17} aria-hidden />} label={copy.safetyState} value={safetyCopy(highestSafety, isSpanish)} tone={highestSafety} />
        <DashboardKpi
          icon={<Activity size={17} aria-hidden />}
          label={copy.latestUpdate}
          value={latestRecord ? formatShortDate(latestRecord.updatedAt ?? latestRecord.createdAt) : copy.noRecords}
          tone="default"
        />
      </div>

      <div className="dashboard-view-grid">
        <section className="dashboard-records" aria-labelledby="dashboard-records-title">
          <div className="dashboard-section-head">
            <div>
              <span>{copy.recordsLabel}</span>
              <h2 id="dashboard-records-title">{copy.recordsTitle}</h2>
            </div>
            <strong>{history.length ? `${history.length}` : t.noHistory}</strong>
          </div>
          <div className="history-list">
            {draft && (
              <article className="history-card draft dashboard-record-card">
                <div className="dashboard-record-main">
                  <span>{draftLabel}</span>
                  <h3>{draft.title}</h3>
                  <p>{formatLongDate(draft.updatedAt)}</p>
                  <em>{draft.bodyAreas.join(", ") || t.unknown}</em>
                </div>
                <div className={`status-pill level-${draft.safetyLevel}`}>{safetyCopy(draft.safetyLevel, isSpanish)}</div>
                <div className="history-card-actions">
                  <button type="button" onClick={onOpenDraft}>
                    <RotateCcw size={14} aria-hidden />
                    {draftActionLabel}
                  </button>
                  <button type="button" className="danger" onClick={onDiscardDraft}>
                    <Trash2 size={14} aria-hidden />
                    {t.discardDraft ?? "Discard"}
                  </button>
                </div>
              </article>
            )}
            {history.length ? (
              history.map((record) => (
                <article key={record.id} className="history-card dashboard-record-card">
                  <div className="dashboard-record-main">
                    <span>{record.status === "reviewed" || record.assessment ? t.reviewReady : copy.savedCheck}</span>
                    <h3>{record.title}</h3>
                    <p>{formatLongDate(record.updatedAt ?? record.createdAt)}</p>
                    <em>{record.bodyAreas.join(", ") || t.unknown}</em>
                  </div>
                  <div className={`status-pill level-${record.safetyLevel}`}>{safetyCopy(record.safetyLevel, isSpanish)}</div>
                  <div className="history-card-actions">
                    <button type="button" onClick={() => onOpenRecord(record)}>
                      <ChevronRight size={14} aria-hidden />
                      {t.openCheck}
                    </button>
                    <button type="button" className="danger icon-only" onClick={() => onDeleteRecord(record)} aria-label={t.deleteRecord ?? "Delete record"}>
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              !draft && (
                <div className="dashboard-empty-state">
                  <FileText size={22} aria-hidden />
                  <p>{t.emptyDashboard}</p>
                  <button type="button" onClick={onNewCheck}>
                    <PlusCircle size={15} aria-hidden />
                    {t.newCheck}
                  </button>
                </div>
              )
            )}
          </div>
        </section>

        <aside className="dashboard-side">
          <section className="dashboard-signal-panel">
            <div className="dashboard-section-head">
              <div>
                <span>{t.symptoms}</span>
                <h2>{t.importantSymptoms}</h2>
              </div>
            </div>
            <ul className="dashboard-signal-list">
              {signalItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="dashboard-signal-panel">
            <div className="dashboard-section-head">
              <div>
                <span>{t.missingInfo}</span>
                <h2>{t.followUps}</h2>
              </div>
            </div>
            {followUpItems.length ? (
              <ul className="dashboard-signal-list muted">
                {followUpItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-quiet-note">{copy.noFollowUps}</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function DashboardKpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "default" | "quiet" | "active" | "none" | "urgent" | "emergency";
}) {
  return (
    <article className={`dashboard-kpi tone-${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function dashboardCopy(isSpanish: boolean) {
  return isSpanish
    ? {
        title: "Registros de salud",
        subtitle: "Borradores, revisiones y senales importantes en un solo lugar.",
        statusOverview: "Resumen del panel",
        activeWork: "Trabajo activo",
        noneActive: "Sin borrador",
        savedReviews: "Revisiones",
        safetyState: "Seguridad",
        latestUpdate: "Ultima actualizacion",
        noRecords: "Sin registros",
        recordsLabel: "Historial",
        recordsTitle: "Chequeos guardados",
        savedCheck: "Chequeo guardado",
        noFollowUps: "Sin pendientes claros por ahora.",
      }
    : {
        title: "Health records",
        subtitle: "Drafts, reviews, and important signals in one focused workspace.",
        statusOverview: "Dashboard overview",
        activeWork: "Active work",
        noneActive: "No draft",
        savedReviews: "Reviews",
        safetyState: "Safety",
        latestUpdate: "Latest update",
        noRecords: "No records",
        recordsLabel: "History",
        recordsTitle: "Saved checks",
        savedCheck: "Saved check",
        noFollowUps: "No clear follow-ups yet.",
      };
}

function safetyCopy(level: "none" | "urgent" | "emergency", isSpanish: boolean) {
  const labels = isSpanish
    ? {
        none: "Sin urgencia",
        urgent: "Revisar pronto",
        emergency: "Emergencia",
      }
    : {
        none: "No urgent signs",
        urgent: "Check soon",
        emergency: "Emergency",
      };
  return labels[level];
}

function highestDashboardSafety(levels: Array<"none" | "urgent" | "emergency">) {
  if (levels.includes("emergency")) return "emergency";
  if (levels.includes("urgent")) return "urgent";
  return "none";
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
