import { bodyFindingsToPromptContext } from "./body-findings";
import { regionLabels } from "./i18n";
import { highestSafetyLevel } from "./safety";
import type { AssessmentResult, BodyRegion, CaseGraph, CheckDraft, CheckRecord, Language } from "./types";

const DB_NAME = "atrium-care-history";
const DB_VERSION = 1;
const RECORDS_STORE = "check-records";
const DRAFTS_STORE = "check-drafts";
const ACTIVE_DRAFT_ID: CheckDraft["id"] = "active-check";
const SCHEMA_VERSION = 1;
const LEGACY_HISTORY_KEY = "care-case-copilot-history-v1";
const MAX_RECORDS = 50;

type StorageHydration = {
  draft: CheckDraft | null;
  history: CheckRecord[];
};

export async function hydrateCheckStorage(): Promise<StorageHydration> {
  if (!canUseIndexedDb()) {
    return {
      draft: null,
      history: loadLegacyHistory(),
    };
  }

  await migrateLegacyHistory();
  const [draft, history] = await Promise.all([loadActiveDraft(), listCheckRecords()]);
  return { draft, history };
}

export async function loadActiveDraft() {
  if (!canUseIndexedDb()) return null;
  return (await getFromStore<CheckDraft>(DRAFTS_STORE, ACTIVE_DRAFT_ID)) ?? null;
}

export async function saveActiveDraft(caseGraph: CaseGraph, assessment?: AssessmentResult | null) {
  if (!canUseIndexedDb() || !shouldPersistDraft(caseGraph, assessment)) return null;
  const existing = await loadActiveDraft();
  const now = new Date().toISOString();
  const snapshot: CaseGraph = assessment
    ? { ...caseGraph, checkStatus: "review-ready" }
    : caseGraph;
  const draft: CheckDraft = {
    id: ACTIVE_DRAFT_ID,
    schemaVersion: SCHEMA_VERSION,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    language: snapshot.language,
    title: titleForCase(snapshot, assessment ?? undefined),
    safetyLevel: highestSafetyLevel(snapshot.redFlags),
    bodyAreas: bodyAreaLabels(snapshot),
    snapshot,
    ...(assessment ? { assessment } : {}),
  };

  await putInStore(DRAFTS_STORE, draft);
  return draft;
}

export async function clearActiveDraft() {
  if (!canUseIndexedDb()) return;
  await deleteFromStore(DRAFTS_STORE, ACTIVE_DRAFT_ID);
}

export async function listCheckRecords() {
  if (!canUseIndexedDb()) return loadLegacyHistory();
  const records = await getAllFromStore<CheckRecord>(RECORDS_STORE);
  return records.sort(byUpdatedDesc).slice(0, MAX_RECORDS);
}

export async function saveCheckRecord(caseGraph: CaseGraph, assessment?: AssessmentResult) {
  const record = buildCheckRecord(caseGraph, assessment);

  if (!canUseIndexedDb()) {
    const history = [record, ...loadLegacyHistory().filter((item) => item.id !== record.id)].slice(0, 12);
    window.localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(history));
    return record;
  }

  await putInStore(RECORDS_STORE, record);
  await pruneOldRecords();
  await clearActiveDraft();
  return record;
}

export async function deleteCheckRecord(recordId: string) {
  if (!canUseIndexedDb()) {
    const history = loadLegacyHistory().filter((record) => record.id !== recordId);
    window.localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(history));
    return history;
  }

  await deleteFromStore(RECORDS_STORE, recordId);
  return listCheckRecords();
}

export function shouldPersistDraft(caseGraph: CaseGraph, assessment?: AssessmentResult | null) {
  if (assessment) return true;
  if (caseGraph.checkStatus !== "active") return false;
  return Boolean(
    caseGraph.userNarrative?.trim() ||
      caseGraph.questionCount ||
      caseGraph.bodyFindings.length ||
      caseGraph.bodyRegions.length ||
      caseGraph.symptoms.length,
  );
}

function buildCheckRecord(caseGraph: CaseGraph, assessment?: AssessmentResult): CheckRecord {
  const now = new Date().toISOString();
  const title = titleForCase(caseGraph, assessment);
  const summary = summaryForCase(caseGraph, assessment);
  return {
    id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: SCHEMA_VERSION,
    status: assessment ? "reviewed" : "saved",
    createdAt: now,
    updatedAt: now,
    language: caseGraph.language,
    title,
    safetyLevel: highestSafetyLevel(caseGraph.redFlags),
    symptomCount: caseGraph.symptoms.length,
    missingCount: caseGraph.missingInfo.length,
    bodyAreas: bodyAreaLabels(caseGraph),
    importantSymptoms: importantSymptomsForCase(caseGraph),
    summary,
    snapshot: {
      ...caseGraph,
      checkStatus: assessment ? "review-ready" : caseGraph.checkStatus,
    },
    assessment,
  };
}

function titleForCase(caseGraph: CaseGraph, assessment?: AssessmentResult) {
  return (
    assessment?.friendlyTitle ||
    assessment?.condition ||
    caseGraph.chiefConcern ||
    caseGraph.symptoms[0]?.label ||
    bodyAreaLabels(caseGraph)[0] ||
    (caseGraph.language === "en" ? "Health check" : "Chequeo de salud")
  ).slice(0, 86);
}

function summaryForCase(caseGraph: CaseGraph, assessment?: AssessmentResult) {
  const bodyContext = bodyFindingsToPromptContext(caseGraph.bodyFindings, caseGraph.language);
  return (
    assessment?.patientMessage ||
    assessment?.rationale ||
    caseGraph.userNarrative ||
    bodyContext ||
    (caseGraph.language === "en" ? "Saved health check." : "Chequeo de salud guardado.")
  ).slice(0, 360);
}

function importantSymptomsForCase(caseGraph: CaseGraph) {
  return Array.from(
    new Set([
      ...caseGraph.symptoms.map((symptom) => symptom.label),
      ...caseGraph.bodyFindings.map((finding) => bodyFindingLabel(finding.region, caseGraph.language)),
      ...caseGraph.relevantPositives,
    ]),
  ).slice(0, 8);
}

function bodyAreaLabels(caseGraph: CaseGraph) {
  return Array.from(
    new Set([
      ...caseGraph.bodyFindings.map((finding) => bodyFindingLabel(finding.region, caseGraph.language)),
      ...caseGraph.bodyRegions.map((selection) => selection.label || bodyFindingLabel(selection.region, caseGraph.language)),
    ]),
  ).slice(0, 8);
}

function bodyFindingLabel(region: BodyRegion, language: Language) {
  return regionLabels[language][region];
}

function byUpdatedDesc(left: CheckRecord, right: CheckRecord) {
  return new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime();
}

async function migrateLegacyHistory() {
  const legacy = loadLegacyHistory();
  if (!legacy.length) return;

  const current = await getAllFromStore<CheckRecord>(RECORDS_STORE);
  const existingIds = new Set(current.map((record) => record.id));
  await Promise.all(
    legacy
      .filter((record) => !existingIds.has(record.id))
      .map((record) =>
        putInStore(RECORDS_STORE, {
          ...record,
          schemaVersion: record.schemaVersion ?? SCHEMA_VERSION,
          status: record.status ?? "saved",
          updatedAt: record.updatedAt ?? record.createdAt,
        }),
      ),
  );
  window.localStorage.removeItem(LEGACY_HISTORY_KEY);
}

function loadLegacyHistory() {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(LEGACY_HISTORY_KEY);
    return saved ? (JSON.parse(saved) as CheckRecord[]) : [];
  } catch {
    return [];
  }
}

async function pruneOldRecords() {
  const records = (await getAllFromStore<CheckRecord>(RECORDS_STORE)).sort(byUpdatedDesc);
  const stale = records.slice(MAX_RECORDS);
  await Promise.all(stale.map((record) => deleteFromStore(RECORDS_STORE, record.id)));
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDS_STORE)) {
        const records = database.createObjectStore(RECORDS_STORE, { keyPath: "id" });
        records.createIndex("updatedAt", "updatedAt");
        records.createIndex("createdAt", "createdAt");
        records.createIndex("safetyLevel", "safetyLevel");
      }
      if (!database.objectStoreNames.contains(DRAFTS_STORE)) {
        database.createObjectStore(DRAFTS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result: T;
    let settled = false;

    try {
      const request = action(store);
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => {
        settled = true;
        database.close();
        reject(request.error);
      };
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      database.close();
      if (!settled) resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      if (settled) return;
      settled = true;
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      if (settled) return;
      settled = true;
      reject(transaction.error);
    };
  });
}

function getFromStore<T>(storeName: string, key: IDBValidKey) {
  return withStore<T | undefined>(storeName, "readonly", (store) => store.get(key));
}

function getAllFromStore<T>(storeName: string) {
  return withStore<T[]>(storeName, "readonly", (store) => store.getAll());
}

function putInStore<T>(storeName: string, value: T) {
  return withStore<IDBValidKey>(storeName, "readwrite", (store) => store.put(value));
}

function deleteFromStore(storeName: string, key: IDBValidKey) {
  return withStore<undefined>(storeName, "readwrite", (store) => store.delete(key));
}
