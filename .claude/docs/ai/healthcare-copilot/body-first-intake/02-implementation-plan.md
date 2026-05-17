# Implementation Plan

This is the detailed build plan for Body-First Intake. Build it as vertical slices. Each milestone should leave the app usable, keep text-only intake working, and update the matching system `.md` whenever behavior changes.

## North Star

The user starts from Entry View. `New Check` opens Body View, where the app asks adaptive questions while the Atrium body becomes the main input surface. The user can answer with text, voice, or body touch; set severity; add symptom quality; and add multiple parts. The OpenRouter-hosted Gemini route and CopilotKit-readable context receive both the natural-language answer and deterministic structured body findings.

The first proof should be small and complete:

```text
Entry View + Body View + floating question + one draft body finding + severity/quality editor + OpenRouter/Gemini context append
```

## Global Constraints

- [ ] Preserve text-only answering at every milestone.
- [ ] Keep deterministic safety rules authoritative.
- [ ] Treat body selections as user-reported symptom context, not diagnosis.
- [ ] Avoid diagnosis or prescription language.
- [ ] Keep `CaseGraph` as the source of truth.
- [ ] Keep Atrium as healthcare visualization, not an office metaphor.
- [ ] Update or create the matching system `.md` for each system-level change.
- [ ] Run scope-appropriate verification after each milestone.

## Milestone 1: Define The Intake Data Model

Purpose: update the case model first so UI and the OpenRouter-hosted model have a clean target.

Recommendation: add a new `bodyFindings` array instead of overloading `bodyRegions`. Keep `bodyRegions` as a simpler derived or legacy field so existing behavior does not break.

Status: implemented on 2026-05-14.

### Tasks

- [x] Open `src/lib/types.ts` and inspect the current `BodyRegion` and `CaseGraph` definitions.
- [x] Add a richer body-selection type named `BodyFinding`.
- [x] Support `region`, `subregion`, `severity`, `quality`, `notes`, `source`, and stable metadata fields.
- [x] Add `bodyFindings: BodyFinding[]` to `CaseGraph`.
- [x] Initialize existing case graph creation paths with `bodyFindings: []`.
- [x] Keep current `bodyRegions` behavior working for compatibility.
- [x] Add helper text serialization for body findings.
- [x] Decide where the serializer should live: `src/lib/body-findings.ts`.
- [x] Update system documentation for the data model.

### Recommended Type Shape

```ts
export type BodyFindingQuality =
  | "sharp"
  | "pressure"
  | "burning"
  | "cramping"
  | "numbness"
  | "other"
  | "unknown";

export type BodyFinding = {
  id: string;
  region: BodyRegion;
  subregion?: string;
  severity?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  quality?: BodyFindingQuality;
  notes?: string;
  source: "inferred" | "user-selected";
  createdAt: string;
  updatedAt?: string;
};
```

### Serializer Contract

The helper should accept findings and return deterministic prompt context:

```ts
bodyFindingsToPromptContext(findings: BodyFinding[], language?: Language): string
```

Example output:

```text
Body findings:
- Head > left temple, pressure, 7/10, user-selected.
```

### Acceptance

- [x] The app can represent `Head > left temple, pressure, 7/10`.
- [x] Multiple body parts can exist independently.
- [x] Existing `bodyRegions` behavior still works.
- [x] Empty `bodyFindings` does not change the existing intake flow.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

### Implemented Files

```text
src/lib/types.ts
src/lib/body-findings.ts
src/lib/agent-flow.ts
src/lib/case-data.ts
src/lib/scenarios.ts
```

## Milestone 2: Split New Entry Into A Dedicated Flow Component

Purpose: reduce `src/app/page.tsx` complexity before adding interaction. This is a refactor milestone. Preserve behavior first.

Status: implemented on 2026-05-14.

### Tasks

- [x] Inspect `src/app/page.tsx` and identify the current check/intake flow boundary.
- [x] Extract `NewCheckFlow` or equivalent logic into a dedicated component.
- [x] Prefer the future name `NewEntryFlow` for user-facing product direction, while avoiding unnecessary churn if internal names need to change gradually.
- [x] Extract the assessment result view into a dedicated component.
- [x] Remove unused legacy body rendering helpers instead of preserving inactive code.
- [x] Keep `CaseGraph` state owned by the main workspace for now.
- [x] Pass state and actions into the new flow component with clear props.
- [x] Preserve all current adaptive question behavior.
- [x] Preserve all current safety behavior.
- [x] Update or create system documentation for the flow/component boundary.

### Suggested File Shape

```text
src/components/new-entry/NewEntryFlow.tsx
src/components/new-entry/AssessmentPage.tsx
src/components/new-entry/types.ts
```

`AtriumIntakeSurface` and `BodyInteractionModel` remain Milestone 3 work because the old body helpers were unused and should be rebuilt deliberately.

### Acceptance

- [x] App still builds.
- [x] Current New Check behavior still works like before.
- [x] No visible UX redesign is required in this milestone.
- [x] `src/app/page.tsx` becomes easier to read and change.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Milestone 3: Build The Atrium New Entry Screen

Purpose: make the first visible product change. Replace the classic text-first check screen with an Atrium intake layout.

Status: superseded on 2026-05-16 by the Atrium Body View merge. The product label intentionally remains `New Check`; `New Entry` remains an internal/component planning phrase only.

Source of truth correction: the active implementation follows the `Atrium Body View CopilotKit Merge` task list. AiThinkers adapts Atrium's body-centered healthcare UX while avoiding legacy office metaphors and Remotion/video code in the production app.

### Tasks

- [x] Keep the main page centered on `Dashboard` and `New Check`.
- [x] Keep visible user-facing copy as `New Check`.
- [x] Build an Atrium intake layout with a calm healthcare surface.
- [x] Put the current question in the foreground.
- [x] Put the simple React Three Fiber body as the main visual anchor.
- [x] Keep the text answer box available and easy to reach.
- [x] Add a selected findings/body areas panel, even if it starts empty.
- [x] Add a clear `Continue` action.
- [x] Make the layout responsive for desktop and mobile.
- [x] Keep keyboard navigation and visible focus states through the region button fallback.
- [x] Update system documentation for the Atrium intake surface.

### Visual Direction

- Medical light surface.
- Blue/teal primary action and focus states.
- Amber/red severity states.
- Calm neutral panels.
- Dense enough for a working healthcare tool.
- Avoid marketing-page composition and decorative clutter.

### Acceptance

- [x] First question feels like an interactive body intake, not a form.
- [x] Text-only users can still answer.
- [x] Body surface is visible and meaningful.
- [x] The layout works on mobile and desktop.
- [x] Existing deterministic safety behavior remains unchanged; safety-aware visual escalation remains Milestone 9.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

### Implemented Files

```text
src/components/AtriumCopilotProvider.tsx
src/components/new-entry/HumanBody3D.tsx
src/components/new-entry/BodyInteractionModel.tsx
src/components/new-entry/AtlasBodyAreaStrip.tsx
src/components/new-entry/NewEntryFlow.tsx
src/components/new-entry/AssessmentPage.tsx
src/app/page.tsx
src/app/layout.tsx
src/app/globals.css
```

### Boundary Notes

Body clicks now persist draft `bodyFindings` immediately. Severity, quality, notes, and removal are edited in the Body View, and `bodyRegions` is synchronized for compatibility.

The body visualization reuses the original Atrium `HumanBody3D` model. `BodyInteractionModel` maps Atrium region ids such as `heart`, `lungs`, and `torso_chest` back to AiThinkers `BodyRegion` values such as `chest`.

The office/agent metaphor from the original Atrium code is not copied directly. Its UI language is reused as healthcare visualization: Entry View, Body View, floating Atlas messages, safety state, body finding editor, and large final review.

## Milestone 4: Infer Body Region From First Answer

Purpose: when the user types something like `my head hurts`, the body should react immediately.

### Tasks

- [ ] Inspect current `inferRegion()` behavior in `src/lib/agent-flow.ts`.
- [ ] Reuse, export, or extend `inferRegion()` instead of creating duplicate inference logic.
- [ ] Return an inferred region to the UI through the existing adaptive answer path.
- [ ] Focus or highlight the inferred body region.
- [ ] Show a short prompt: `Touch where it feels wrong.`
- [ ] Support no-match behavior without error.
- [ ] Keep safety checks running before or alongside visual inference.
- [ ] Update system documentation for region inference.

### Inference Examples

```text
I feel bad of head -> head
my head hurts -> head
stomach pain -> abdomen
chest tightness -> chest
my back hurts -> back
```

### Acceptance

- [ ] `I feel bad of head` highlights head.
- [ ] `stomach pain` highlights abdomen.
- [ ] `chest tightness` highlights chest.
- [ ] Chest-related text still triggers deterministic safety checks when appropriate.
- [ ] Unknown text leaves the body neutral and keeps intake usable.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Milestone 5: Add Touch-To-Select Body Parts

Purpose: make the body model a real input surface, not only a visual reaction.

### Tasks

- [ ] Make each coarse body region clickable or tappable.
- [ ] Make each region reachable by keyboard or provide an accessible list alternative.
- [ ] On tap, create or select a `BodyFinding`.
- [ ] Show controls for severity.
- [ ] Show symptom quality chips.
- [ ] Add `Unknown` or `Not sure`.
- [ ] Add optional notes.
- [ ] Save the finding into `caseGraph.bodyFindings`.
- [ ] Keep selected regions visibly colored.
- [ ] Keep the current selected finding editable.
- [ ] Update system documentation for body finding editing.

### First Controls

Severity:

```text
0 1 2 3 4 5 6 7 8 9 10
```

Quality chips:

```text
sharp
pressure
burning
cramping
numbness
unknown
```

### Acceptance

- [ ] User can tap head.
- [ ] User can set severity to `7/10`.
- [ ] User can choose `pressure`.
- [ ] User can mark the finding as unknown or not sure.
- [ ] Selected head stays visibly colored.
- [ ] The finding persists when the next question appears.
- [ ] Text-only answering still works.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Milestone 6: Add Subregions Progressively

Purpose: add precision after selection without turning the UI into an anatomy exam.

Recommendation: do not start too granular. First selection is coarse. Subregions appear only after a region is selected.

Status: implemented in `BodyFindingEditor` and focused `HumanBody3D` body-surface zones with stable ids from `src/lib/body-location-taxonomy.ts`. The 3D layer renders high-contrast anatomical surface patches on the zoomed body area instead of floating boxes, and canvas clicks write to the same optional subregion state as the editor buttons. Each patch has a backing rim so the divided parts stay merged with the body while remaining clearly visible. Head/face rendering uses smaller depth-aware patches so facial areas remain separated rather than overlapping.

### Tasks

- [x] Confirm coarse V1 regions.
- [x] Add optional subregion data support if not already added.
- [x] After region select, show only the subregions for that region.
- [x] Let the user skip subregion selection.
- [x] Keep the selected body region visible while subregions are shown.
- [x] Store the chosen subregion in the selected `BodyFinding`.
- [x] Let zoomed 3D subregion clicks update the same `BodyFinding.subregion` field.
- [x] Update serializer output to include subregions when present.
- [x] Update system documentation for subregions.

### V1 Region Set

```text
head
chest
abdomen
back
left arm
right arm
left hand
right hand
left leg
right leg
left foot
right foot
```

Status: implemented. Hands and feet are first-class `BodyRegion` values because distal symptoms are meaningful intake context.

### V1 Subregions

Head:

```text
forehead
top of head
back of head
face
eye area
ear area
nose/sinus
mouth/jaw
neck
```

Abdomen:

```text
upper left
upper center / stomach
upper right
middle left
center / navel
middle right
lower left
lower center / pelvis
lower right
```

Chest:

```text
upper left
upper center
upper right
lower left
lower center
lower right
```

Back:

```text
upper left
upper center
upper right
middle left
middle right
lower left
lower center
lower right
```

Arms:

```text
upper arm
lower arm / forearm
```

Legs:

```text
upper leg / thigh
lower leg / shin-calf
```

Hands and feet:

```text
palm
back of hand
thumb
index finger
middle finger
ring finger
pinky finger
top of foot
sole
heel
arch
big toe
other toes
```

### Acceptance

- [x] User can select `chest -> upper left chest` or equivalent.
- [x] User can skip subregion through `Whole area`.
- [x] User can select and clear a precise subregion from the zoomed 3D body.
- [x] UI remains simple because subregions appear only after region selection.
- [x] Serializer includes subregion when available.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Milestone 7: Convert Body Interaction Into OpenRouter/Gemini Context

Purpose: make the interaction useful to the adaptive question loop, not just visual.

Status: implemented with `src/lib/intake-guardrails.ts` selecting the next useful question slot before `/api/intake-ui` asks the provider to phrase it. The route now rejects repeated questions, uses a question ledger, redirects off-topic and medical-boundary turns, and enforces a hard cap of 8 Atlas questions.

### Tasks

- [ ] Create or finalize `bodyFindingsToPromptContext()`.
- [ ] Add body findings to the `/api/intake-ui` request payload.
- [ ] Include both natural text and structured body selections.
- [ ] Update `src/app/api/intake-ui/route.ts` to include body findings in the model prompt.
- [ ] Keep prompt context deterministic and readable.
- [ ] Tell the model that body findings are user-reported symptom-location context, not diagnostic findings.
- [ ] Ensure fallback flow still works without an OpenRouter key.
- [ ] Update system documentation for OpenRouter/Gemini intake context.

### Guardrail Tasks

- [x] Add `currentQuestionSlot`, `questionLedger`, and `scopeState` to `CaseGraph`.
- [x] Classify off-topic, medical-boundary, emergency, and in-scope turns before applying answers.
- [x] Redirect off-topic turns without saving them as symptom narrative.
- [x] Redirect diagnosis/prescription requests without diagnostic or prescribing language.
- [x] Mark answered question slots in the ledger.
- [x] Select the next useful slot deterministically before provider generation.
- [x] Reject provider questions that repeat the ledger.
- [x] Lower active-intake hard cap to 8 Atlas questions.

### Prompt Context Example

```text
Latest answer: "I feel bad of head."

Body findings:
- Head > left temple, pressure, 7/10, user-selected.
```

### Acceptance

- [ ] The model receives natural answer plus structured body findings.
- [ ] The model can ask a better second question based on selected part and severity.
- [x] Off-topic and boundary-breaking turns do not enter the symptom narrative.
- [x] Repeated question slots are blocked by the ledger.
- [ ] Body touch affects the next generated UI.
- [ ] Empty `bodyFindings` does not break the route.
- [ ] Fallback flow still works without OpenRouter.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Milestone 8: Support Multiple Parts Cleanly

Purpose: support real symptom patterns where multiple body areas matter.

### Tasks

- [ ] Keep the full body visible after multiple selections.
- [ ] Add `Add another area`.
- [ ] Let users select multiple regions independently.
- [ ] Show a compact selected-parts list.
- [ ] Let users edit each selected finding.
- [ ] Let users remove each selected finding.
- [ ] Use severity colors per selected region.
- [ ] Prevent duplicate confusion by either editing an existing region finding or allowing intentional duplicate findings with clear labels.
- [ ] Ensure all findings appear in the case graph.
- [ ] Ensure all findings reach OpenRouter/Gemini context.
- [ ] Update system documentation for multiple body findings.

### Severity Colors

```text
0-3 mild
4-6 moderate
7-10 severe
unknown neutral
```

### Acceptance

- [ ] Head and chest can both be selected.
- [ ] Head and abdomen can both be selected.
- [ ] Each finding has independent severity and quality.
- [ ] Each finding can be edited.
- [ ] Each finding can be removed.
- [ ] The next question receives all selected findings.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Milestone 9: Safety-Aware Visual States

Purpose: tie body interaction to the red-flag engine in `src/lib/safety.ts`.

### Tasks

- [ ] Inspect current safety levels and red-flag triggers.
- [ ] Map safety level to visual safety state.
- [ ] Keep copy calm and non-diagnostic.
- [ ] Ensure emergency-level deterministic rules can stop or redirect normal intake.
- [ ] Make chest plus breathing plus severe language visibly escalate when safety rules trigger.
- [ ] Avoid letting the model soften or override deterministic safety output.
- [ ] Ensure body selection alone does not create emergency copy unless safety rules support it.
- [ ] Update system documentation for safety-aware visuals.

### Safety Copy Boundary

Use urgent-care guidance only when deterministic rules trigger. Do not infer diagnosis from a selected region, severity, or model output alone.

### Acceptance

- [ ] Safety state is visible immediately.
- [ ] Severe chest plus breathing language produces an emergency or urgent state when rules trigger.
- [ ] Normal intake stops or changes mode for emergency-level rules.
- [ ] No diagnosis language is introduced.
- [ ] The model cannot override deterministic safety level.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Milestone 10: Build The Full Atrium Tab

Purpose: after New Entry works, make Atrium a persistent visual case board.

### Tasks

- [ ] Add workspace tabs.
- [ ] Preserve New Entry state when switching tabs.
- [ ] Build the Atrium tab around the current `CaseGraph`.
- [ ] Show body map with selected regions.
- [ ] Show selected findings.
- [ ] Show safety state.
- [ ] Show missing information.
- [ ] Show timeline.
- [ ] Show symptoms.
- [ ] Show summary readiness.
- [ ] Let the user return to Intake without losing state.
- [ ] Update system documentation for the full Atrium tab.

### Target Tabs

```text
Intake | Atrium | Summary | Records
```

### Acceptance

- [ ] User can switch from question flow to case map anytime.
- [ ] Atrium explains the current case at a glance.
- [ ] Summary can use the same case graph.
- [ ] Records can remain placeholder or existing behavior until implemented.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## First Build Milestone

Build this first because it proves the whole loop without overbuilding:

- [ ] Data model includes `bodyFindings`.
- [ ] `New Entry` screen shows a question, text input, interactive body, and selected finding editor.
- [ ] User can select one body region.
- [ ] User can set severity with a slider.
- [ ] User can choose one quality chip.
- [ ] `bodyFindingsToPromptContext()` creates prompt text.
- [ ] `/api/intake-ui` receives and uses body findings through OpenRouter.
- [ ] Text-only flow still works.
- [ ] Safety checks still work.
- [ ] Matching system docs are updated.

## Key Decisions To Discuss

### Body Granularity

Recommendation: start with 8 coarse regions, then show subregions only after selection.

Discussion needed: should left/right arms and legs be first-class `BodyRegion` values, or should `arm` and `leg` stay as regions with `left/right` as subregion or side metadata?

### 3D Depth

Recommendation: use the existing simple React Three Fiber body first. Do not hunt for a perfect anatomy model yet.

Discussion needed: should V1 prioritize 3D presence or precision? My recommendation is presence first, precision second.

### Required Vs Optional Touch

Recommendation: body touch should be encouraged, not required. Text-only must still work.

Discussion needed: should the UI nudge after inferred region with `Touch where it feels wrong`, or should it wait until the user pauses?

### Pain Controls

Recommendation: start with severity slider plus five primary chips:

```text
sharp
pressure
burning
cramping
numbness
```

Also include `unknown` or `not sure`.

Discussion needed: should `unknown` be a chip beside qualities or a separate affordance?

### Data Model

Recommendation: add `bodyFindings`, keep `bodyRegions` as a simpler derived or legacy field.

Discussion needed: should `bodyRegions` be computed from `bodyFindings` immediately, or only maintained manually during the transition?

## Definition Of Done For Any Milestone

- [ ] The app remains usable after the milestone.
- [ ] Text-only intake remains available.
- [ ] Deterministic safety behavior remains intact.
- [ ] New or changed systems have matching `.md` documentation.
- [ ] User-facing copy stays non-diagnostic.
- [ ] Lint/build checks pass or failures are documented.
- [ ] The final answer names files changed and verification performed.
