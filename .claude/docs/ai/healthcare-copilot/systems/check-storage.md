# Check Storage

## Purpose

Check Storage is the local persistence layer for AiThinkers health checks. It stores the active `New Check` draft, saved check records, final review snapshots, and a migration path from the earlier localStorage prototype.

The selected database is browser IndexedDB. It gives the prototype durable local history without adding server setup, account sync, or premature patient-data infrastructure.

## Why This Exists

The Dashboard needs real continuity:

```text
start a check -> leave or refresh -> resume the draft
finish review -> refresh -> reopen the final review
finish review -> save the reviewed record -> reopen from Dashboard
delete record -> remove it from local history
```

localStorage was enough for a first WIP history list, but it is too small and too loose for richer case snapshots. IndexedDB is still local-first, but it supports structured objects, larger payloads, record stores, and versioned migrations.

## User Flow

1. User starts `New Check`.
2. Once the user types, answers, or maps a body area, the current `CaseGraph` autosaves as the active draft.
3. User can leave the check and open Dashboard.
4. Dashboard shows a `Current draft` card when one exists.
5. `Continue check` restores the draft into Body View.
6. `Discard draft` deletes only the active draft.
7. When the flow reaches final review, the active draft stores both the `CaseGraph` snapshot and the `AssessmentResult`.
8. Refreshing `/?view=check` restores the final review screen instead of sending the user back into intake.
9. Dashboard shows a review-ready active draft as `Review ready` with an `Open review` action.
10. Final review includes `Save review`.
11. Saving creates a reviewed history record, stores the assessment snapshot, clears the active draft, and updates Dashboard.
12. Saved records can be reopened from Dashboard.
13. Saved records can be deleted from Dashboard.

## Technical Flow

`src/lib/check-storage.ts` owns all persistence behavior. UI components do not call IndexedDB directly.

Database:

```text
name: atrium-care-history
version: 1
stores:
  check-records
  check-drafts
```

Stores:

```text
check-records
  keyPath: id
  indexes: updatedAt, createdAt, safetyLevel

check-drafts
  keyPath: id
  active draft id: active-check
```

Storage API:

```ts
hydrateCheckStorage()
loadActiveDraft()
saveActiveDraft(caseGraph, assessment?)
clearActiveDraft()
listCheckRecords()
saveCheckRecord(caseGraph, assessment?)
deleteCheckRecord(recordId)
shouldPersistDraft(caseGraph)
```

`hydrateCheckStorage()` runs when `AppShell` mounts. It loads records and the active draft, and migrates the legacy `care-case-copilot-history-v1` localStorage list into IndexedDB when present.

`AppShell` debounces active draft saves. A draft is persisted when the check has meaningful user work: narrative text, question progress, body findings, body regions, symptoms, or a final review assessment.

`NewEntryFlow` reports assessment state to `AppShell` through `onAssessmentChange`. `AppShell` persists that assessment in the active draft, and hydrates it back into `NewEntryFlow` as `initialAssessment` after refresh or `Continue check`.

`AssessmentPage` calls `onSaveRecord(caseGraph, assessment)` from the final review. The save button disables after a successful save so repeated clicks do not create duplicate reviewed records. After an explicit save, draft autosave is paused for that same displayed review so the cleared active draft is not recreated immediately; the saved record remains the durable copy.

IndexedDB writes resolve after the transaction completes. This keeps the app from treating a record as saved before the browser has committed it.

## Data And State

`CheckDraft` stores the current active check and, once available, the current final review:

```ts
type CheckDraft = {
  id: "active-check";
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  language: Language;
  title: string;
  safetyLevel: "none" | "urgent" | "emergency";
  bodyAreas: string[];
  snapshot: CaseGraph;
  assessment?: AssessmentResult;
};
```

`CheckRecord` stores saved or reviewed history:

```ts
type CheckRecord = {
  id: string;
  schemaVersion?: number;
  status?: "saved" | "reviewed";
  createdAt: string;
  updatedAt?: string;
  language: Language;
  title: string;
  safetyLevel: "none" | "urgent" | "emergency";
  symptomCount: number;
  missingCount: number;
  bodyAreas: string[];
  importantSymptoms: string[];
  summary: string;
  snapshot: CaseGraph;
  assessment?: AssessmentResult;
};
```

Records are capped to the most recent 50 local entries. The cap is intentionally conservative for the prototype and can be revisited when real account-backed storage exists.

## Files

```text
src/lib/check-storage.ts
src/lib/types.ts
src/components/app-shell/AppShell.tsx
src/components/records/RecordsDashboard.tsx
src/components/new-entry/AssessmentPage.tsx
src/components/new-entry/NewEntryFlow.tsx
src/lib/i18n.ts
src/app/globals.css
```

Related docs:

```text
.claude/docs/ai/healthcare-copilot/systems/app-shell.md
.claude/docs/ai/healthcare-copilot/systems/new-entry-flow.md
```

## Safety And Privacy Notes

IndexedDB is local to the user's browser profile. It is not cloud sync, not encrypted application storage, and not a production patient record database.

Saved data can include health-adjacent narrative, body areas, safety flags, and final review text. The app should continue avoiding unnecessary PHI and should add an explicit privacy/export/delete strategy before storing real patient data.

The storage layer persists user-reported symptom context and non-diagnostic assessment snapshots. It must not store provider-generated diagnosis authority or override deterministic safety rules.

## Acceptance Checks

Automated:

```powershell
npm run lint
npm run build
```

Manual:

1. Start a check, answer the first question, navigate to Dashboard, and confirm `Current draft` appears.
2. Click `Continue check` and confirm Body View restores the same case state.
3. Click `Discard draft` and confirm Dashboard removes the draft.
4. Finish a check, refresh `/?view=check`, and confirm the final review still renders.
5. Open Dashboard before pressing `Save review` and confirm the active card says `Review ready`.
6. Click `Open review` and confirm the same final review opens.
7. Click `Save review` and confirm the button changes to `Saved`.
8. Open Dashboard and confirm the reviewed record appears.
9. Reopen the record and confirm the saved snapshot loads into Body View.
10. Delete a record and confirm it is removed from Dashboard after refresh.
11. If legacy localStorage history exists under `care-case-copilot-history-v1`, confirm it appears in Dashboard once and the legacy key is removed.

## Open Questions

- Should IndexedDB records be encrypted with a user-held key before any real patient data use?
- Should Dashboard get export/import controls before backend sync exists?
- Should records move to an account-backed database once authentication and consent copy are ready?
