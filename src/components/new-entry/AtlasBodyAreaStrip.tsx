"use client";

import { getBodySubregionLabel } from "@/lib/body-location-taxonomy";
import { formatBodyFinding } from "@/lib/body-findings";
import { regionLabels } from "@/lib/i18n";
import type { BodyFinding, BodyRegion, CaseGraph, Language } from "@/lib/types";
import { X } from "lucide-react";

type AtlasBodyAreaStripProps = {
  language: Language;
  caseGraph: CaseGraph;
  previewRegion?: BodyRegion | null;
  activeFindingId?: string | null;
  onFocusFinding: (findingId: string) => void;
  onRemoveFinding: (findingId: string) => void;
  onFocusRegion: (region: BodyRegion) => void;
  onRemoveRegion: (region: BodyRegion) => void;
};

const copy = {
  en: {
    title: "Body areas",
    count: "selected",
    empty: "Tap the body, type naturally, or choose a shortcut below. Selected areas stay here.",
    editing: "Editing",
    saved: "Saved",
    needsDetail: "Needs detail",
    inView: "In view",
    mapped: "Mapped",
    focus: "Focus",
    remove: "Remove",
  },
  es: {
    title: "Zonas del cuerpo",
    count: "seleccionadas",
    empty: "Toca el cuerpo, escribe natural o elige un acceso abajo. Las zonas seleccionadas quedan aqui.",
    editing: "Editando",
    saved: "Guardado",
    needsDetail: "Falta detalle",
    inView: "En vista",
    mapped: "Mapeado",
    focus: "Enfocar",
    remove: "Quitar",
  },
} satisfies Record<Language, Record<string, string>>;

export function AtlasBodyAreaStrip({
  language,
  caseGraph,
  previewRegion,
  activeFindingId,
  onFocusFinding,
  onRemoveFinding,
  onFocusRegion,
  onRemoveRegion,
}: AtlasBodyAreaStripProps) {
  const t = copy[language];
  const findingRegions = new Set(caseGraph.bodyFindings.map((finding) => finding.region));
  const regionOnlyEntries = uniqueRegions([
    ...caseGraph.bodyRegions.map((item) => item.region),
    ...(previewRegion ? [previewRegion] : []),
  ]).filter((region) => !findingRegions.has(region));
  const total = caseGraph.bodyFindings.length + regionOnlyEntries.length;

  return (
    <section className="atlas-body-area-strip" aria-labelledby="atlas-body-area-title">
      <div className="atlas-body-area-head">
        <span id="atlas-body-area-title">{t.title}</span>
        <strong>
          {total} {t.count}
        </strong>
      </div>

      {total ? (
        <div className="atlas-body-area-list">
          {caseGraph.bodyFindings.map((finding) => (
            <FindingChip
              key={finding.id}
              finding={finding}
              language={language}
              active={activeFindingId === finding.id}
              preview={previewRegion === finding.region}
              onFocus={() => onFocusFinding(finding.id)}
              onRemove={() => onRemoveFinding(finding.id)}
            />
          ))}

          {regionOnlyEntries.map((region) => (
            <RegionChip
              key={region}
              region={region}
              language={language}
              preview={previewRegion === region}
              onFocus={() => onFocusRegion(region)}
              onRemove={() => onRemoveRegion(region)}
            />
          ))}
        </div>
      ) : (
        <p>{t.empty}</p>
      )}
    </section>
  );
}

function FindingChip({
  finding,
  language,
  active,
  preview,
  onFocus,
  onRemove,
}: {
  finding: BodyFinding;
  language: Language;
  active: boolean;
  preview: boolean;
  onFocus: () => void;
  onRemove: () => void;
}) {
  const t = copy[language];
  const fullLabel = formatBodyFinding(finding, language);
  const status = active ? t.editing : finding.status === "confirmed" ? t.saved : t.needsDetail;
  const detail = [
    status,
    typeof finding.severity === "number" ? `${finding.severity}/10` : undefined,
  ].filter(Boolean);

  return (
    <article className={chipClassName(active, preview)}>
      <button type="button" className="atlas-body-area-main" onClick={onFocus} aria-label={`${t.focus} ${fullLabel}`}>
        <strong>{locationLabel(finding, language)}</strong>
        <span>{detail.join(" · ")}</span>
      </button>
      <button type="button" className="atlas-body-area-remove" onClick={onRemove} aria-label={`${t.remove} ${fullLabel}`}>
        <X size={14} aria-hidden />
      </button>
    </article>
  );
}

function RegionChip({
  region,
  language,
  preview,
  onFocus,
  onRemove,
}: {
  region: BodyRegion;
  language: Language;
  preview: boolean;
  onFocus: () => void;
  onRemove: () => void;
}) {
  const t = copy[language];
  const label = regionLabels[language][region];

  return (
    <article className={chipClassName(false, preview)}>
      <button type="button" className="atlas-body-area-main" onClick={onFocus} aria-label={`${t.focus} ${label}`}>
        <strong>{label}</strong>
        <span>{preview ? t.inView : t.mapped}</span>
      </button>
      <button type="button" className="atlas-body-area-remove" onClick={onRemove} aria-label={`${t.remove} ${label}`}>
        <X size={14} aria-hidden />
      </button>
    </article>
  );
}

function locationLabel(finding: BodyFinding, language: Language) {
  return [
    regionLabels[language][finding.region],
    finding.subregion ? getBodySubregionLabel(finding.region, finding.subregion, language) : undefined,
  ]
    .filter(Boolean)
    .join(" > ");
}

function uniqueRegions(regions: BodyRegion[]) {
  return Array.from(new Set(regions));
}

function chipClassName(active: boolean, preview: boolean) {
  return ["atlas-body-area-chip", active ? "active" : "", preview ? "preview" : ""].filter(Boolean).join(" ");
}
