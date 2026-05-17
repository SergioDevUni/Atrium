# Data Model And Prompt Context

## Existing Model

Current `CaseGraph` already includes:

- `bodyRegions`
- `symptoms`
- `timeline`
- `medicalHistory`
- `medications`
- `allergies`
- `missingInfo`
- `redFlags`

Body-first intake should not replace these immediately. Add a richer interaction-specific layer and derive or sync simpler fields where needed.

## Implemented Addition

Status: implemented and extended on 2026-05-16.

`BodyFinding` now exists in `src/lib/types.ts`.

```ts
export type BodyFindingQuality =
  | "sharp"
  | "pressure"
  | "burning"
  | "cramping"
  | "numbness"
  | "other"
  | "unknown";

export type BodyFindingStatus = "draft" | "confirmed";

export type BodyFinding = {
  id: string;
  region: BodyRegion;
  subregion?: string;
  severity?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  quality?: BodyFindingQuality;
  notes?: string;
  source: "inferred" | "user-selected";
  status?: BodyFindingStatus;
  createdAt: string;
  updatedAt?: string;
};
```

`CaseGraph` now includes:

```ts
bodyFindings: BodyFinding[];
```

Current case graph creation paths initialize it as an empty array:

```text
src/lib/agent-flow.ts
src/lib/case-data.ts
src/lib/scenarios.ts
```

## Why New Field Instead Of Only `bodyRegions`

`bodyRegions` is a simple selected-region list.

`bodyFindings` captures an actual user finding:

- region
- optional subregion
- severity
- quality
- notes
- source
- multiple independent entries

This avoids overloading `bodyRegions` and makes OpenRouter/Gemini context cleaner.

## Region And Subregion Strategy

V1 regions:

```text
head
chest
abdomen
back
leftArm
rightArm
leftHand
rightHand
leftLeg
rightLeg
leftFoot
rightFoot
```

Optional subregions:

```text
head: forehead, top of head, back of head, face, eye area, ear area, nose/sinus, mouth/jaw, neck
chest: upper left, upper center, upper right, lower left, lower center, lower right
abdomen/stomach: upper left, upper center/stomach, upper right, middle left, center/navel, middle right, lower left, lower center/pelvis, lower right
back: upper left, upper center, upper right, middle left, middle right, lower left, lower center, lower right
arm: upper arm, lower arm/forearm
hand: palm, back of hand, thumb, index finger, middle finger, ring finger, pinky finger
leg: upper leg/thigh, lower leg/shin-calf
foot: top of foot, sole, heel, arch, big toe, other toes
```

Do not model organs in v1.

The implementation stores subregions as stable ids from `src/lib/body-location-taxonomy.ts`, then resolves localized labels when formatting body findings. This avoids saving language-specific display text in the case graph.

Hands and feet are not only subregions of arms and legs. They are first-class selectable regions because distal symptoms often carry different intake meaning than broader limb symptoms.

## Serialization For OpenRouter/Gemini

Helper:

```ts
export function bodyFindingsToPromptContext(findings: BodyFinding[], language?: Language): string
```

Body finding helpers live in:

```text
src/lib/body-findings.ts
```

Current helper contract:

```ts
createDraftBodyFinding({ region, source, severity, quality, now }): BodyFinding
upsertBodyFinding(caseGraph, finding, language): CaseGraph
ensureDraftBodyFinding({ caseGraph, region, source, severity, language }): { caseGraph, finding }
updateBodyFinding(caseGraph, findingId, updates, language): CaseGraph
removeBodyFinding(caseGraph, findingId, language): CaseGraph
syncBodyRegionsFromFindings(caseGraph, language): CaseGraph
bodyFindingsToPromptContext(findings, language): string
formatBodyFinding(finding, language): string
```

`removeBodyFinding()` also removes a matching derived `bodyRegions` compatibility entry when that region no longer has any `bodyFindings`. This prevents deleted body areas from reappearing in fallback map summaries.

`updateBodyFinding()` accepts `{ subregion: string }` to set a precise location and `{ subregion: null }` to clear it back to whole-area selection.

Example output:

```text
Body findings:
- Head > left temple, pressure, 7/10, user-selected.
- Abdomen > lower right, cramping, 5/10, user-selected.
```

The `/api/intake-ui` payload should include:

```ts
{
  latestAnswer,
  caseGraph,
  bodyFindings,
  bodyFindingsContext,
  language
}
```

The route prompt should say:

```text
Use body findings as user-provided symptom-location context. They are not diagnostic findings.
```

The client also publishes the active Body View context to CopilotKit through `useCopilotReadable`:

```ts
{
  language,
  latestAnswer,
  currentQuestion,
  questionCount,
  safetyLevel,
  bodyFindings,
  bodyFindingsContext
}
```

## Guardrail State

The active intake loop also stores lightweight conversation-control metadata:

```ts
currentQuestionSlot?: IntakeQuestionSlot;
questionLedger?: QuestionLedgerEntry[];
scopeState?: IntakeScopeState;
```

`currentQuestionSlot` tells `applyAdaptiveAnswer()` which slot the user just answered. `questionLedger` stores normalized question text and answered state so Atlas does not ask the same thing again. `scopeState` counts off-topic and medical-boundary redirects so the app can stop an unproductive loop.

These fields are not clinical facts. They should stay small and should not store more answer text than needed.

## Synchronization With Existing Fields

When a body finding is created or updated:

- ensure `caseGraph.bodyRegions` includes the region
- reuse an existing draft for the same region where possible
- upgrade an inferred finding to `user-selected` when the user clicks that region
- mark the finding `confirmed` when quality or severity is known
- append to timeline only when user continues, not on every slider movement

Recommended rule:

- Body editor updates `bodyFindings` immediately.
- `applyAdaptiveAnswer()` still handles natural language.
- A small merge helper creates derived `bodyRegions` and symptom labels before sending to the OpenRouter-hosted model.

## Safety

Body findings alone should not diagnose.

They can help safety checks when paired with user language:

- chest + severe + breath language
- head + severe + neck stiffness language
- abdomen + severe/worsening language

Keep deterministic safety rules in `src/lib/safety.ts`.
