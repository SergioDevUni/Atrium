import { regionLabels } from "./i18n";
import { getBodySubregionLabel } from "./body-location-taxonomy";
import type { BodyFinding, BodyFindingQuality, BodyRegion, CaseGraph, Language } from "./types";

const qualityLabels: Record<Language, Record<BodyFindingQuality, string>> = {
  en: {
    sharp: "sharp",
    pressure: "pressure",
    burning: "burning",
    cramping: "cramping",
    numbness: "numbness",
    other: "other",
    unknown: "unknown quality",
  },
  es: {
    sharp: "punzante",
    pressure: "presion",
    burning: "ardor",
    cramping: "colico",
    numbness: "entumecimiento",
    other: "otro",
    unknown: "sensacion desconocida",
  },
};

export type BodyFindingUpdate = Partial<Pick<BodyFinding, "severity" | "quality" | "notes" | "source" | "status">> & {
  subregion?: string | null;
};

export function bodyFindingsToPromptContext(
  findings: BodyFinding[],
  language: Language = "en",
) {
  if (!findings.length) {
    return language === "en" ? "Body findings: none reported." : "Hallazgos corporales: ninguno reportado.";
  }

  const heading = language === "en" ? "Body findings:" : "Hallazgos corporales:";
  return [
    heading,
    ...findings.map((finding) => `- ${formatBodyFinding(finding, language)}.`),
  ].join("\n");
}

export function formatBodyFinding(finding: BodyFinding, language: Language = "en") {
  const location = [
    regionLabels[language][finding.region],
    finding.subregion ? getBodySubregionLabel(finding.region, finding.subregion, language) : undefined,
  ]
    .filter(Boolean)
    .join(" > ");
  const details = [
    finding.quality ? qualityLabels[language][finding.quality] : undefined,
    typeof finding.severity === "number" ? `${finding.severity}/10` : undefined,
    sourceLabel(finding.source, language),
    finding.notes ? `notes: ${finding.notes}` : undefined,
  ].filter(Boolean);

  return details.length ? `${location}, ${details.join(", ")}` : location;
}

export function createDraftBodyFinding({
  region,
  source,
  severity,
  quality = "unknown",
  now = new Date().toISOString(),
}: {
  region: BodyRegion;
  source: BodyFinding["source"];
  severity?: BodyFinding["severity"];
  quality?: BodyFindingQuality;
  now?: string;
}): BodyFinding {
  return {
    id: `body-finding-${now}-${region}`.replace(/[:.]/g, "-"),
    region,
    severity,
    quality,
    source,
    status: "draft",
    createdAt: now,
  };
}

export function upsertBodyFinding(
  caseGraph: CaseGraph,
  finding: BodyFinding,
  language: Language = caseGraph.language,
): CaseGraph {
  const existingIndex = caseGraph.bodyFindings.findIndex((item) => item.id === finding.id);
  const bodyFindings =
    existingIndex >= 0
      ? caseGraph.bodyFindings.map((item, index) => (index === existingIndex ? finding : item))
      : [...caseGraph.bodyFindings, finding];

  return syncBodyRegionsFromFindings(
    {
      ...caseGraph,
      bodyFindings,
    },
    language,
  );
}

export function ensureDraftBodyFinding({
  caseGraph,
  region,
  source,
  severity,
  language = caseGraph.language,
}: {
  caseGraph: CaseGraph;
  region: BodyRegion;
  source: BodyFinding["source"];
  severity?: BodyFinding["severity"];
  language?: Language;
}): { caseGraph: CaseGraph; finding: BodyFinding } {
  const existing =
    caseGraph.bodyFindings.find((finding) => finding.region === region && finding.status !== "confirmed") ??
    caseGraph.bodyFindings.find((finding) => finding.region === region);

  if (existing) {
    const next: BodyFinding = {
      ...existing,
      source: source === "user-selected" ? "user-selected" : existing.source,
      severity: severity ?? existing.severity,
      quality: existing.quality ?? "unknown",
      status: existing.status ?? "draft",
      updatedAt: new Date().toISOString(),
    };
    return {
      caseGraph: upsertBodyFinding(caseGraph, next, language),
      finding: next,
    };
  }

  const finding = createDraftBodyFinding({
    region,
    source,
    severity,
  });

  return {
    caseGraph: upsertBodyFinding(caseGraph, finding, language),
    finding,
  };
}

export function updateBodyFinding(
  caseGraph: CaseGraph,
  findingId: string,
  updates: BodyFindingUpdate,
  language: Language = caseGraph.language,
) {
  const bodyFindings = caseGraph.bodyFindings.map((finding) => {
    if (finding.id !== findingId) return finding;
    const { subregion, ...restUpdates } = updates;
    const next = applySubregionUpdate(
      {
        ...finding,
        ...restUpdates,
        updatedAt: new Date().toISOString(),
      },
      subregion,
    );
    return {
      ...next,
      status: shouldConfirmFinding(next) ? "confirmed" : next.status ?? "draft",
    };
  });

  return syncBodyRegionsFromFindings(
    {
      ...caseGraph,
      bodyFindings,
    },
    language,
  );
}

export function removeBodyFinding(caseGraph: CaseGraph, findingId: string, language: Language = caseGraph.language) {
  const removedFinding = caseGraph.bodyFindings.find((finding) => finding.id === findingId);
  const bodyFindings = caseGraph.bodyFindings.filter((finding) => finding.id !== findingId);
  const bodyRegions =
    removedFinding && !bodyFindings.some((finding) => finding.region === removedFinding.region)
      ? caseGraph.bodyRegions.filter((selection) => selection.region !== removedFinding.region)
      : caseGraph.bodyRegions;

  return syncBodyRegionsFromFindings(
    {
      ...caseGraph,
      bodyRegions,
      bodyFindings,
    },
    language,
  );
}

export function syncBodyRegionsFromFindings(caseGraph: CaseGraph, language: Language = caseGraph.language): CaseGraph {
  const fromFindings = caseGraph.bodyFindings.map((finding) => ({
    region: finding.region,
    label: regionLabels[language][finding.region],
    severity: finding.severity,
  }));
  const merged = [...caseGraph.bodyRegions, ...fromFindings].reduce<CaseGraph["bodyRegions"]>((acc, item) => {
    const existing = acc.find((region) => region.region === item.region);
    if (existing) {
      if (typeof item.severity === "number") existing.severity = item.severity;
      return acc;
    }
    return [...acc, item];
  }, []);

  return {
    ...caseGraph,
    bodyRegions: merged,
  };
}

function shouldConfirmFinding(finding: BodyFinding) {
  return typeof finding.severity === "number" || Boolean(finding.quality && finding.quality !== "unknown");
}

function applySubregionUpdate(finding: BodyFinding, subregion: string | null | undefined): BodyFinding {
  if (subregion === undefined) return finding;
  if (subregion) {
    return {
      ...finding,
      subregion,
    };
  }

  const findingWithoutSubregion = { ...finding };
  delete findingWithoutSubregion.subregion;
  return findingWithoutSubregion;
}

function sourceLabel(source: BodyFinding["source"], language: Language) {
  if (language === "es") {
    return source === "user-selected" ? "seleccionado por usuario" : "inferido";
  }
  return source === "user-selected" ? "user-selected" : "inferred";
}
