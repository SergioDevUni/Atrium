# Body-First Intake

## Purpose

Body-First Intake is the active `New Check` experience for the healthcare copilot. It turns intake from a classic form or text-only chat into an adaptive question flow where the body model is a primary input surface.

The user can answer by text, voice, or body touch; set severity; choose symptom quality; and add multiple affected parts. These selections become structured case context for the OpenRouter-hosted Gemini model, CopilotKit-readable context, and the local case graph.

## Why This Exists

The product needs a memorable and useful intake experience that helps users express symptoms more precisely without forcing them into medical language.

The body-first approach should:

- Make the first interaction feel like healthcare, not generic chat.
- Help users describe where and how symptoms feel.
- Improve the quality of adaptive follow-up questions.
- Preserve accessibility by keeping text-only input available.
- Keep deterministic safety rules visible and authoritative.

## User Flow

1. User opens Entry View.
2. User chooses `New Check` to enter Body View or `Dashboard` to open records WIP.
3. Body View asks `What brings you in today?` in a floating Atlas card.
4. User types, speaks, or clicks a body area first.
5. Body click creates a draft `BodyFinding` immediately.
6. Natural text or voice can infer a body region and create an inferred draft finding.
7. Floating follow-up cards ask one focused question with four focused choices, one open answer path, and one smart none/not-applicable path.
8. Off-topic or diagnosis/prescription requests are redirected and not saved as symptom context.
9. User sets severity, symptom quality, and optional notes in a compact body finding editor.
10. The OpenRouter-hosted Gemini route and CopilotKit-readable context receive natural answer plus structured body findings.
11. The next question can respond to both text and body context without repeating completed question slots.
12. Final review shows a large Atlas-style workspace where the body becomes a dim background layer and the report becomes the main focus.

## Technical Flow

The implementation should be built in vertical milestones:

1. Add `BodyFinding` and `bodyFindings` to the case model.
2. Extract New Entry flow from `src/app/page.tsx`.
3. Build the Atrium-style Body View surface.
4. Reuse or extend region inference from `src/lib/agent-flow.ts`.
5. Make body regions selectable and create draft findings immediately.
6. Add progressive subregions.
7. Serialize body findings into OpenRouter/Gemini context.
8. Add intake guardrails for scope redirects, question ledger state, and loop limits.
9. Support multiple selected body parts.
10. Map safety state to visual states.
11. Add records/dashboard polish and optional reactive care-team visuals.

The detailed checklist lives in:

```text
.claude/docs/ai/healthcare-copilot/body-first-intake/02-implementation-plan.md
```

## Data And State

`CaseGraph` should remain the source of truth.

`BodyFinding` in `src/lib/types.ts` now includes explicit draft/confirmed status:

```ts
export type BodyFindingStatus = "draft" | "confirmed";

export type BodyFinding = {
  id: string;
  region: BodyRegion;
  subregion?: string;
  severity?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  quality?: "sharp" | "pressure" | "burning" | "cramping" | "numbness" | "other" | "unknown";
  notes?: string;
  source: "inferred" | "user-selected";
  status?: BodyFindingStatus;
  createdAt: string;
  updatedAt?: string;
};
```

Implemented `CaseGraph` field:

```ts
bodyFindings: BodyFinding[];
currentQuestionSlot?: IntakeQuestionSlot;
questionLedger?: QuestionLedgerEntry[];
scopeState?: IntakeScopeState;
```

`bodyRegions` stays available for compatibility and summary behavior. Do not overload it with severity, quality, or subregion details.

Body finding prompt serialization lives in:

```text
src/lib/body-findings.ts
```

The helper contract is:

```ts
createDraftBodyFinding(...)
ensureDraftBodyFinding(...)
updateBodyFinding(..., { subregion?: string | null })
removeBodyFinding(...)
syncBodyRegionsFromFindings(...)
bodyFindingsToPromptContext(findings: BodyFinding[], language?: Language): string
```

`status` starts as `draft`. `updateBodyFinding()` promotes the finding to `confirmed` when severity or a known quality is present.

`ensureDraftBodyFinding()` reuses an existing finding for the same region when possible. If a user clicks a region that was previously inferred, the source upgrades to `user-selected`.

`removeBodyFinding()` removes the durable finding and drops any matching derived `bodyRegions` compatibility entry when no remaining finding uses that region. This keeps the Atlas body-area strip from showing deleted areas as stale observed regions.

Progressive subregion options live in:

```text
src/lib/body-location-taxonomy.ts
```

The taxonomy stores stable subregion ids and language-specific labels. The current Level 2 breakdown is:

```text
head: 9 options
chest: 6 options
abdomen/stomach: 9 options
back: 8 options
each arm: 2 options
each hand: 7 options
each leg: 2 options
each foot: 6 options
```

`BodyFindingEditor` renders inside the Atlas question card as a closed optional-details dropdown for the currently active region. Its summary shows the selected area, and `Where exactly?`, severity, and symptom quality remain inside nested optional dropdowns. The `Where exactly?` subregion options open only when the user clicks it. Selecting `Whole area` clears the subregion. `formatBodyFinding()` resolves stable subregion ids back to display labels before rendering or serializing prompt context.

`AtlasBodyAreaStrip` renders selected body areas inside the Atlas question card. It replaces the previous separate `Current map` panel so body-area focus, removal, optional details, and question answering live in the same surface.

`HumanBody3D` mirrors the same stable subregion ids as focused 3D surface zones. The zones are visible and clickable only after a coarse body region is zoomed, so the default body map remains simple while zoomed areas become fully interactive. The current rendering strategy avoids floating boxes: torso/back precision uses rounded surface patches, arms/legs use translucent capsule bands, and hands/feet/fingers/toes use smaller anatomical patches. A stronger fill and backing rim make every visible subregion understandable without detaching it from the body. Head/face precision uses smaller depth-aware patches to avoid overlap between broad face, eyes, nose/sinus, mouth/jaw, top/back head, ears, and neck.

Intake guardrails live in:

```text
src/lib/intake-guardrails.ts
```

They classify scope, select the next useful question slot, track the question ledger, reject repeated provider questions, ask at least 2 intake questions before normal final review, and enforce a hard cap of 10 Atlas questions. Off-topic and medical-boundary turns become redirect cards instead of symptom narrative.

The final review can hand the user back into intake through `Continue review`. That action chooses the next most useful missing slot, such as body precision, symptom quality, severity, timing, red flags, background, or medications/allergies. It is disabled after the hard 10-question cap, preserving the loop guard while still letting a user add more detail when there is room.

## Files

Primary current files:

```text
src/app/page.tsx
src/app/layout.tsx
src/components/AtriumCopilotProvider.tsx
src/components/new-entry/NewEntryFlow.tsx
src/components/new-entry/AtlasBodyAreaStrip.tsx
src/components/new-entry/BodyInteractionModel.tsx
src/components/new-entry/AssessmentPage.tsx
src/lib/types.ts
src/lib/body-findings.ts
src/lib/body-location-taxonomy.ts
src/lib/intake-guardrails.ts
src/lib/agent-flow.ts
src/lib/safety.ts
src/lib/case-data.ts
src/lib/scenarios.ts
src/app/api/intake-ui/route.ts
src/app/api/patient-advice/route.ts
src/app/api/copilotkit/route.ts
```

## Safety And Privacy Notes

Body findings are user-reported symptom-location context. They are not diagnostic findings.

Hands and feet are first-class `BodyRegion` values:

```text
leftHand
rightHand
leftFoot
rightFoot
```

They stay separate from arms and legs so the case graph can distinguish distal symptoms such as wrist pain, finger numbness, palm burns, ankle swelling, toe pain, or foot injury from broader limb symptoms.

Deterministic safety rules in `src/lib/safety.ts` must remain authoritative. The model should not override emergency or urgent safety states. Urgent-care language should appear only when deterministic rules trigger it.

The UI should keep copy calm, non-diagnostic, and oriented around intake, education, and visit preparation.

## Acceptance Checks

Core proof:

- User can answer with text only.
- Case graph can represent multiple `bodyFindings`.
- Body finding severity supports `0-10`.
- Body finding subregions are stored as stable ids and formatted through the taxonomy.
- Focused 3D subregion surfaces are visible on the body and update the same `BodyFinding.subregion` field as the editor buttons.
- `bodyFindingsToPromptContext()` serializes findings into prompt context.
- Removing a body finding also removes its stale derived `bodyRegions` entry.
- Existing body region behavior remains available.
- Safety checks still trigger correctly.
- Body click creates a draft finding immediately.
- Left/right hands and left/right feet can create their own draft findings.
- Natural text can infer and highlight a body region.
- Floating guided questions preserve one open answer option and one slot-aware none/not-applicable option.
- Off-topic answers redirect without entering `userNarrative`.
- Repeated or already answered question slots are not asked again.
- The active intake route reaches final review by the hard question cap.

Verification:

```text
npm run lint
npm run build
```

Build verification passed on 2026-05-16 for the Body View merge slice.

For visible UI changes, also run the app and inspect the New Entry flow in the browser.

## Open Questions

- Should V1 use the existing simple React Three Fiber body or a more polished 2D body map?
- Should `unknown` be a quality chip or a separate control?
- Should `bodyRegions` be derived immediately from `bodyFindings` or maintained separately during transition?
- Should selected parts be always visible on mobile or shown as a bottom sheet?
