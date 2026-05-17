# Condition Tree

## Purpose

The Condition Tree is Atrium's inherited-condition reference view. It adapts the original Atrium pedigree tree into AiThinkers so users can inspect respiratory and atopic condition patterns across a fictional four-generation family record.

This view supports review and education. It does not diagnose, prescribe, or confirm what a user has.

## Source

The first production version is adapted from the read-only original Atrium copy:

```text
AtriumOriginalCode - copia/Atrium/apps/frontend/src/lib/medicalRecord.ts
AtriumOriginalCode - copia/Atrium/apps/frontend/src/components/genealogy/GenealogyTree.tsx
```

The source repo is treated as read-only. AiThinkers owns its adapted implementation in:

```text
src/lib/condition-tree.ts
src/components/condition-tree/ConditionTreeView.tsx
src/app/globals.css
```

## User Flow

1. User opens `Condition Tree` from the global navbar.
2. The page opens as a tree-first workspace: compact context at the top, the hereditary tree as the main surface, and a sticky selected-person inspector.
3. The default selected node is the index patient, Carlos Alejandro Mendoza Ríos.
4. User clicks any family member node.
5. The detail panel updates with generation, status, respiratory conditions, atopy/allergy history, notes, genetic relevance, and candidate genes for the index patient.
6. The page still exposes `Start New Check` and `Open Dashboard` actions.

## Technical Flow

The shell exposes the view with the query state:

```text
conditions -> /?view=conditions
```

`src/lib/condition-tree.ts` owns:

- pedigree people
- fixed node positions
- stage dimensions
- severity metadata
- hereditary summary
- summary stats

`src/components/condition-tree/ConditionTreeView.tsx` owns:

- selected family member state
- fixed SVG relationship lines
- person nodes
- legend
- detail panel
- current-check context chips
- review-support safety boundary

The current case graph is only used to show lightweight context chips. This version does not infer diagnoses or mutate the active case from the tree.

## Visual System

The condition tree follows the same clinical atlas language as the current Atrium flow:

- dark clinical background with a subtle grid
- cyan lineage paths and active-node focus
- warm gold for the index case and review-only context
- rose, amber, sky, and muted tones for condition severity
- compact summary/stat strips so the tree remains the main element
- sticky inspector on desktop, stacked inspector on smaller screens

## Data Shape

```ts
PedigreePerson
  id
  name
  shortName
  sex
  generation
  bornYear
  diedYear
  age
  status
  causeOfDeath
  isProband
  smoker
  conditions[]
  atopicConditions[]
  severity
  notes
  geneticRelevance
  parentIds[]
  partnerId
```

Severity values:

```text
asma_clinica
atopia
subclinico
ninguno
```

## Safety And Privacy Notes

- The page says `Condition Tree` in nav and frames the content as a hereditary reference, not as a diagnosis engine.
- It uses the fictional Atrium teaching record from the original repo.
- The page says it is review support only.
- The tree does not call CopilotKit, Gemini, or any external model.
- The tree does not write PHI or local case state.
- Emergency and urgent rules remain owned by deterministic safety and intake guardrail systems.

## Acceptance Checks

Automated:

```powershell
npm run lint
npm run build
```

Manual:

1. Open `/`.
2. Confirm navbar shows Atrium, Home, New Check, Dashboard, Condition Tree, EN/ES, Saved, settings, and profile.
3. Click `Condition Tree` and confirm URL becomes `/?view=conditions`.
4. Confirm the page shows `Hereditary Condition Tree` / `Árbol heredofamiliar`.
5. Confirm the tree shows four generations with clickable family members.
6. Click several nodes and confirm the detail panel changes.
7. Confirm the review-support safety boundary is visible.
8. Confirm Spanish language changes the shell and view copy while preserving the original clinical record content.

## Open Questions

- Should this stay as a fixed teaching pedigree or become a reusable pedigree renderer for future records?
- Should the Body View later deep-link into a selected family member or condition category?
- Should final review reference this tree only when family history is relevant?
