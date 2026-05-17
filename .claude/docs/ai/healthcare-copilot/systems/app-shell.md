# App Shell

## Purpose

The App Shell is the production boundary for AiThinkers' top-level workspace. It owns the high-level app state, URL-backed view navigation, language selection, check history hydration, active draft hydration, and the handoff between Entry View, Body View, Dashboard, and Condition Tree.

The shell keeps `src/app/page.tsx` small and makes the fast-paced product flow easier to evolve without mixing unrelated UI concerns into one file.

## Why This Exists

The Atrium merge made the opening product flow clearer:

```text
Entry View
  New Check -> Body View
  Dashboard -> Records WIP
  Condition Tree -> inherited-condition pedigree map
```

That flow was first implemented directly in the page. The next production step is to make the boundaries explicit:

- `page.tsx` resolves the initial URL view.
- `AppShell` owns app-level state and navigation.
- `EntryView` owns only the centered launch choices.
- `RecordsDashboard` owns only records/history UI.
- `ConditionTreeView` owns the original Atrium inherited-condition pedigree map.
- `NewEntryFlow` remains the Body View owner.

This keeps the app modular enough for rapid iteration while avoiding a premature routing or state-management rewrite.

## User Flow

1. User opens `/`.
2. Entry View shows the centered `New Check` and `Dashboard` choices.
3. `New Check` starts an adaptive check and updates the URL to `?view=check`.
4. Body View runs inside `NewEntryFlow`.
5. `Dashboard` updates the URL to `?view=dashboard` and opens records/history.
6. `Condition Tree` updates the URL to `?view=conditions` and opens the inherited-condition pedigree map.
7. Browser Back and Forward restore the shell view from the URL query state.
8. A direct visit to `/?view=check` restores the active draft when one exists, otherwise it starts a new adaptive check.
9. A direct visit to `/?view=dashboard` opens the Dashboard view.
10. A direct visit to `/?view=conditions` opens the Condition Tree view.

## Technical Flow

`src/app/page.tsx` is a server entry point. It reads `searchParams.view`, normalizes it into an `AppView`, and passes that to `AppShell`:

```text
home      -> /
check     -> /?view=check
dashboard -> /?view=dashboard
conditions -> /?view=conditions
```

`AppShell` is a client component. It owns:

```text
language
view
history
draft
caseGraph
```

Navigation uses `window.history.pushState()` for user actions and `popstate` for browser Back/Forward. The shell does not introduce a full router yet because the app currently has one primary workspace with three lightweight views.

`AppTopbar` receives only shell callbacks. It does not own medical state. The current production navbar is visible in every shell view, including active `New Check`:

```text
Atrium | Home | New Check | Dashboard | Condition Tree | EN/ES | Saved | Settings | Profile
```

`New Check` keeps local Body View controls inside `NewEntryFlow`, but global navigation remains in `AppTopbar` so users can leave the check, open Dashboard, or open Condition Tree without hunting for separate controls.

`EntryView` receives only `onNewCheck` and `onDashboard`.

`RecordsDashboard` receives check history, summary lists, and action callbacks. It renders as a records workspace, not a generic dashboard-card mosaic: a compact status overview, a primary saved-check timeline, and a right-side case-signal inspector.

`ConditionTreeView` receives the current case graph for lightweight context chips, but it does not write to the graph or infer diagnoses from it.

`NewEntryFlow` continues to own the Body View, floating question loop, body findings, and final review transition.

`src/lib/check-storage.ts` owns persistence. The shell calls it to hydrate local records, hydrate the active draft, autosave meaningful active checks, save final reviews, discard drafts, and delete records.

## Data And State

Shell view type:

```ts
export type AppView = "home" | "check" | "dashboard" | "conditions";
```

Persisted storage:

```text
IndexedDB database: atrium-care-history
stores: check-records, check-drafts
legacy migration key: care-case-copilot-history-v1
```

State rules:

- `hydrateCheckStorage()` loads the active draft and saved records when the shell mounts.
- `startNewCheck()` clears any active draft, creates a fresh adaptive case, and navigates to `check`.
- Active checks autosave as a draft only after meaningful user work exists.
- `openDraft()` restores the active draft snapshot and navigates to `check`.
- `discardDraft()` deletes the active draft and returns the user to Home when they are in Body View.
- `saveCurrentRecord()` stores a saved/reviewed record, clears the active draft, and refreshes Dashboard history.
- `removeRecord()` deletes a saved record from local history.
- `openRecord()` restores the record snapshot and navigates to `check`.
- `switchLanguage()` rebuilds the active case from a scenario when possible; otherwise it starts or resets the case based on current check status.
- Direct `?view=check` restores a draft during shell initialization when available.
- Direct `?view=conditions` opens the Condition Tree without starting a check.
- Browser `popstate` starts a check only if the current case is idle.

Dashboard presentation rules:

- The header uses the medical Atrium visual system: dark charcoal surface, cyan metadata, gold `New check` action, restrained borders, and soft panel shadows.
- The primary area is the records timeline. Drafts and review-ready drafts are shown first and use gold emphasis.
- Saved records use semantic safety pills: soft green for no urgent signs, amber for check-soon, red only for emergency.
- The side inspector shows important symptoms and follow-ups as scannable signal lists, not large decorative cards.
- Empty state keeps the same surface language and offers a direct `New check` action.

## Files

```text
src/app/page.tsx
src/components/app-shell/AppShell.tsx
src/components/app-shell/AppTopbar.tsx
src/components/condition-tree/ConditionTreeView.tsx
src/components/entry-view/EntryView.tsx
src/components/records/RecordsDashboard.tsx
src/components/new-entry/NewEntryFlow.tsx
src/lib/check-storage.ts
src/lib/types.ts
```

Related docs:

```text
.claude/docs/ai/healthcare-copilot/systems/atrium-intake-surface.md
.claude/docs/ai/healthcare-copilot/systems/condition-tree.md
.claude/docs/ai/healthcare-copilot/systems/new-entry-flow.md
.claude/docs/ai/healthcare-copilot/systems/body-first-intake.md
.claude/docs/ai/healthcare-copilot/systems/check-storage.md
```

## Safety And Privacy Notes

The shell does not make medical decisions. It only moves users between views and preserves existing case state.

The Condition Tree is exposed by the shell but remains review-support content. It adapts the original Atrium pedigree tree and does not turn current case state into diagnoses.

Deterministic safety remains in the healthcare logic layer. The shell may display the safety strip on Dashboard, but `detectRedFlags()` and `highestSafetyLevel()` remain the source of truth.

History and drafts are local browser IndexedDB state for the current prototype. IndexedDB is not cloud sync, account storage, or encrypted application storage. It should continue to avoid unnecessary PHI and should be replaced, encrypted, or guarded before production patient data storage.

## Acceptance Checks

Automated:

```powershell
npm run lint
npm run build
```

Manual:

1. Open `/` and confirm Entry View renders centered actions.
2. Open `/?view=dashboard` and confirm Dashboard renders directly.
3. Open `/?view=conditions` and confirm Condition Tree renders directly.
4. Open `/?view=check` and confirm Body View starts directly.
5. Confirm the global navbar remains visible in Body View and marks `New Check` active.
6. Click `New Check`, then use browser Back and confirm the shell returns to Entry View.
7. Click `Dashboard`, then browser Back and confirm the shell returns to the previous view.
8. Click `Condition Tree`, then browser Back and confirm the shell returns to the previous view.
9. Open a saved record from Dashboard and confirm the snapshot opens in Body View.
10. Start a check, add one answer or body area, open Dashboard, and confirm the active draft appears.
11. Continue the draft and confirm Body View restores the same case state.
12. Discard the draft and confirm it disappears from Dashboard.
13. Save final review and confirm the reviewed record appears in Dashboard.
14. Delete a saved record and confirm it is removed from Dashboard.
15. Confirm Dashboard uses the dark Atrium medical palette, compact metrics, record timeline, and signal inspector without falling back to the old light card layout.

## Open Questions

- Should `home`, `check`, and `dashboard` become route segments after records become durable?
- Should IndexedDB records be encrypted before real patient data is stored?
- Should records support export/import before backend sync exists?
- Should `conditions` become a route segment after the tree becomes a clinician-authored content system?
