# Atrium Body View CopilotKit Merge Plan

## Plan Name

Atrium Body View CopilotKit Merge

## Purpose

Merge the best UX/UI direction from Atrium into AiThinkers without replacing the AiThinkers healthcare intelligence layer.

The final product should feel like Atrium from the first screen: a body-centered healthcare workspace with floating messages, voice/text/body input, and a large final review. AiThinkers remains the source of truth for case state, body findings, safety checks, CopilotKit, OpenRouter/Gemini routing, patient advice, and records.

## Implementation Status

Status on 2026-05-16: first vertical slice implemented in AiThinkers.

Completed in this pass:

- Production foundation pass extracted the app shell into modular view components.
- `src/app/page.tsx` now resolves the initial URL view and delegates to `AppShell`.
- `AppShell` owns language, view, check history, current case graph, highlighted body region, and URL-backed navigation.
- `EntryView`, `RecordsDashboard`, and `AppTopbar` are now separate components.
- Browser Back and Forward work through `?view=check` and `?view=dashboard`.
- Hands and feet are now first-class selectable `BodyRegion` values, with meaningful 3D pick areas for reliable selection.
- Body View now separates durable selection, active editor state, and 3D camera focus with `Zoom out`, `Close detail`, and Escape handling.
- Entry View opens with `New Check` and `Dashboard`.
- `New Check` opens Body View with the floating Atlas message.
- Body click creates a draft `BodyFinding` immediately.
- Natural text and voice answers share the same answer pipeline.
- Inferred regions create inferred draft findings and highlight the body.
- Guided follow-up questions render as floating multiple-choice cards with `Something else...`.
- Body finding editor updates quality, severity, notes, and removal.
- Atlas body-area chips can refocus/edit saved areas and remove them with an `X`.
- Body-region shortcut buttons now toggle active areas off when clicked again.
- Progressive subregions now appear in the active body finding editor using a reusable body-location taxonomy.
- Zoomed Atrium 3D subregions now render as clearly visible body-surface patches with backing rims and update the same optional `BodyFinding.subregion` state as the editor buttons.
- Head/face subregions now use smaller depth-aware patches so the face, eyes, nose/sinus, mouth/jaw, ears, top/back head, and neck do not visually overlap.
- Body View floating panels now use coordinated HUD lanes to prevent overlapping cards, controls, body badge, original model modes, region shortcuts, and status actions.
- `/api/intake-ui` receives `bodyFindings` and `bodyFindingsContext`.
- CopilotKit runtime is wired into the React tree, and Body View publishes readable context.
- Intake guardrails now classify off-topic and medical-boundary turns, keep a question ledger, select the next useful question slot, reject repeated questions, and cap active Atlas questions at 8.
- Deterministic safety appears inside Body View.
- Final review uses a large review card and includes reported body findings.
- The existing app navbar/topbar is preserved on Entry View and Dashboard.
- The navbar/topbar structure is preserved but recolored to match the Atrium dark/gold/cyan palette.
- The Entry View action buttons are centered in the page content area below the navbar.
- The Entry View ambient SVG map/background layer has been removed.
- Body View reuses the original Atrium `HumanBody3D` scene through a region mapping wrapper.

Deferred after the first slice:

- Reactive care-team animation.
- Automated interaction tests for the manual voice/body flow.

## Desired Product Shape

The product has three major states:

```text
Entry View
  New Check -> Body View
  Dashboard -> Records WIP

Body View
  Body is the main scene
  Floating CopilotKit messages guide the intake
  User can type, speak, or click the body first
  Body clicks create draft body findings immediately

Final Review
  Large review card uses almost all screen space
  Body fades back or is no longer relevant
```

## Source Of Truth

AiThinkers owns:

```text
src/lib/types.ts
src/lib/agent-flow.ts
src/lib/body-findings.ts
src/lib/safety.ts
src/app/api/intake-ui/route.ts
src/app/api/patient-advice/route.ts
src/app/api/copilotkit/route.ts
src/app/page.tsx
src/components/app-shell/*
src/components/entry-view/*
src/components/records/*
src/components/new-entry/*
```

Atrium UX/UI donor areas:

```text
C:\Users\serch\OneDrive\Escritorio\Hackatons\AtriumOriginalCode\Atrium\apps\frontend\src\app\clinic\page.tsx
C:\Users\serch\OneDrive\Escritorio\Hackatons\AtriumOriginalCode\Atrium\apps\frontend\src\components\clinic\HumanBody3D.tsx
C:\Users\serch\OneDrive\Escritorio\Hackatons\AtriumOriginalCode\Atrium\apps\frontend\src\components\atlas\AtlasCards.tsx
C:\Users\serch\OneDrive\Escritorio\Hackatons\AtriumOriginalCode\Atrium\apps\frontend\src\components\organ-viz\OrganVisualizer.tsx
C:\Users\serch\OneDrive\Escritorio\Hackatons\AtriumOriginalCode\Atrium\apps\frontend\public\care-team\index.html
```

## Non-Negotiable Product Decisions

- Atrium is the UX shell.
- AiThinkers is the healthcare intelligence engine.
- The body is a real input surface, not decoration.
- Clicking a body part creates a draft `BodyFinding` immediately.
- CopilotKit powers the question UI, but the visible UX is floating Atrium messages, not a generic sidebar chat.
- Each question should use multiple choices plus one open answer option.
- Text-only intake must remain available.
- Voice input should route into the same answer path as text.
- Safety rules remain deterministic and authoritative.
- Body findings are user-reported symptom-location context, not diagnoses.
- Final review becomes a large card/workspace where the body is no longer the main focus.

## Target User Flow

### 1. Entry View

User opens the app and sees a direct app start, not a marketing page.

Primary choices:

```text
New Check
Dashboard
```

Expected behavior:

- `New Check` opens the Body View.
- `Dashboard` opens records/history WIP.
- The Atrium body can be visible as ambient context, but it should not compete with the two choices.
- Language and privacy/no-PHI controls can stay available as compact controls.

### 2. New Check Starts In Body View

The body becomes the main scene.

The first floating message appears near the body:

```text
Atlas
What brings you in today?
```

Input options:

- Type an answer.
- Speak an answer.
- Click a body part first.

The user should feel they are interacting with the body scene, not filling out a form.

### 3. Body Click First

When the user clicks a body part before text:

```text
Click head
-> create draft BodyFinding immediately
-> set activeFindingId
-> highlight/focus head
-> show floating CopilotKit question
```

Draft finding shape:

```ts
{
  id: string;
  region: "head";
  source: "user-selected";
  severity: undefined;
  quality: "unknown";
  notes: undefined;
  status: "draft";
  createdAt: string;
}
```

Implementation note:

- Current `BodyFinding` does not include `status`.
- Add `status?: "draft" | "confirmed"` or use incomplete severity/quality as draft state.
- Preferred: add explicit `status` because final review can label incomplete findings cleanly.

First body-click floating question example:

```text
Atlas
What are you feeling here?

[Pressure] [Sharp pain] [Dizziness] [Numbness]
[Something else...]
```

### 4. Natural Text Or Voice First

When user types or speaks:

```text
I feel bad of head
```

Expected behavior:

```text
applyAdaptiveAnswer()
-> infer head
-> create inferred draft finding if none exists
-> highlight/focus head
-> run deterministic safety checks
-> ask next CopilotKit multiple-choice question
```

If the user then clicks the highlighted body part:

```text
inferred draft finding
-> upgraded to user-selected finding
-> activeFindingId remains stable if possible
```

### 5. Floating Question Loop

All follow-up questions happen in the Body View as floating messages.

Question format:

```text
1 focused question
4 multiple-choice answers
1 open answer option
optional None / Not sure when useful
```

The open answer option expands inline:

```text
[Something else...]
-> small text field
-> Continue
```

Avoid:

- Generic CopilotKit sidebar as the primary interaction.
- Large form panels during active intake.
- Multiple unrelated panels competing with the body.
- Asking another blank open-text question after the first answer unless the user chose the open answer option.

### 6. Body Finding Editor

After region and quality are known, show a compact floating editor.

Required controls:

```text
Region label
Severity 0-10
Quality chips
Open notes only when needed
Not sure option
Remove/edit finding
Add another area
```

Quality chips:

```text
pressure
sharp
burning
cramping
numbness
unknown
something else
```

Severity behavior:

```text
0 none
1-3 mild
4-6 moderate
7-10 severe
unknown allowed
```

### 7. CopilotKit And `/api/intake-ui`

CopilotKit should power the question experience, but the visible UI remains custom Atrium floating cards.

Data sent to the question engine:

```ts
{
  latestAnswer,
  currentQuestion,
  questionCount,
  caseGraph,
  bodyFindings: caseGraph.bodyFindings,
  bodyFindingsContext: bodyFindingsToPromptContext(caseGraph.bodyFindings, language),
  language
}
```

Prompt rule:

```text
Use body findings as user-reported symptom-location context.
They are not diagnostic findings.
Return one focused question with four quick choices and one open-answer path.
```

Expected UI mode mapping:

```text
body_locator       -> body focus floating message
severity_scale     -> body finding editor message
timeline           -> timing floating message
red_flags          -> safety floating message
medication_history -> history/context floating message
assessment         -> final review card
```

### 8. Safety Interruptions

Safety can interrupt the floating message loop at any point.

Safety source of truth:

```text
src/lib/safety.ts
detectRedFlags()
highestSafetyLevel()
```

Expected behavior:

- Emergency/urgent rules trigger immediately after text, voice, or relevant follow-up answers.
- Safety state is visible in the Body View.
- A floating safety card appears when needed.
- The model cannot downgrade deterministic safety.
- Body selection alone should not create urgent/emergency language unless deterministic rules support it.

### 9. Final Review

When enough information exists, the app changes mode.

The body should no longer be the main interaction. It can fade, blur, shrink, or disappear.

Final review card uses almost all available space.

Review sections:

```text
Primary non-diagnostic review
Safety status
What you reported
Body findings
Severity and quality
Timeline
Relevant positives
Relevant negatives
Medication/allergy/history notes
Missing information
Questions to ask a clinician
What to monitor
Sources/disclaimer if present
```

Final review copy boundaries:

- Do not diagnose.
- Do not prescribe.
- Do not replace emergency care.
- Use visit-prep language.
- Make urgent/emergency guidance deterministic.

## Implementation Milestones

### Milestone 0: Baseline And Branch Hygiene

Status: completed for the first vertical slice. Baseline and implementation builds passed. Decision updated after review: preserve the existing navbar/topbar and reuse Atrium's original `HumanBody3D` model.

- [ ] Confirm target repo is `C:\Users\serch\OneDrive\Escritorio\Hackatons\AiThinkers`.
- [ ] Run `npm run build` before changes.
- [ ] Review current files:
  - [ ] `src/app/page.tsx`
  - [ ] `src/components/new-entry/NewEntryFlow.tsx`
  - [ ] `src/components/new-entry/BodyInteractionModel.tsx`
  - [ ] `src/components/new-entry/AtlasBodyAreaStrip.tsx`
  - [ ] `src/lib/types.ts`
  - [ ] `src/lib/body-findings.ts`
  - [ ] `src/lib/agent-flow.ts`
  - [ ] `src/app/api/intake-ui/route.ts`
  - [ ] `src/app/api/copilotkit/route.ts`
- [ ] Review Atrium donor files:
  - [ ] `apps/frontend/src/app/clinic/page.tsx`
  - [ ] `apps/frontend/src/components/clinic/HumanBody3D.tsx`
  - [ ] `apps/frontend/src/components/atlas/AtlasCards.tsx`
- [ ] Decide whether the first implementation ports Atrium's full `HumanBody3D` or upgrades the existing AiThinkers `BodyInteractionModel` in place.
- [ ] Update this task list with any changed decision before coding.

Acceptance:

- [ ] Baseline build result is recorded in the final implementation answer.
- [ ] No code changes yet.

### Milestone 1: Entry View

Goal: simplify the app opening into two clear choices.

Status: implemented through `src/components/app-shell/AppShell.tsx`, `src/components/entry-view/EntryView.tsx`, and `src/app/globals.css`. The existing navbar/topbar structure remains unchanged; Entry View does not add a second navigation header, and the two launch buttons are centered.

Tasks:

- [ ] Replace the current home composition with an Atrium-style Entry View.
- [ ] Show only the core choices:
  - [ ] `New Check`
  - [ ] `Dashboard`
- [ ] Route `New Check` to Body View.
- [ ] Route `Dashboard` to Records WIP.
- [ ] Preserve language switch if still needed.
- [ ] Preserve no-PHI / educational framing.
- [ ] Avoid a marketing hero page.
- [ ] Keep the first screen usable on mobile.
- [ ] Update or create a system doc if this changes the workspace shell contract.

Files likely touched:

```text
src/app/page.tsx
src/components/app-shell/AppShell.tsx
src/components/app-shell/AppTopbar.tsx
src/components/entry-view/EntryView.tsx
src/app/globals.css
.claude/docs/ai/healthcare-copilot/systems/atrium-intake-surface.md
.claude/docs/ai/healthcare-copilot/systems/app-shell.md
```

Acceptance:

- [ ] Opening app shows Entry View.
- [ ] `New Check` opens Body View.
- [ ] `Dashboard` opens Records WIP.
- [ ] No old form-like intake appears before Body View.
- [ ] `npm run build` passes.

### Milestone 2: Body View Shell With Floating Message Layer

Goal: make the Body View the active intake stage.

Status: implemented inside `NewEntryFlow` as the current Body View shell. The body model is Atrium's original `HumanBody3D`, wrapped by `BodyInteractionModel`.

Tasks:

- [ ] Create or refactor a `BodyView` component.
- [ ] Move active intake UI out of page-level layout into the Body View.
- [ ] Render body scene as the main visual surface.
- [ ] Add floating message container.
- [ ] Add first floating message:
  - [ ] speaker label, probably `Atlas`
  - [ ] question text
  - [ ] text input
  - [ ] mic button placeholder or active voice support
  - [ ] continue action
- [x] Ensure floating message placement works over desktop body view.
- [x] Ensure mobile layout does not cover body controls or overflow.
- [x] Add keyboard focus styles.
- [ ] Keep text-only path complete.

Suggested files:

```text
src/components/body-view/BodyView.tsx
src/components/body-view/FloatingMessage.tsx
src/components/body-view/FloatingQuestionCard.tsx
src/components/body-view/FloatingInputBar.tsx
src/components/new-entry/NewEntryFlow.tsx
src/app/globals.css
```

Acceptance:

- [ ] User starts New Check and sees the body with a floating first question.
- [ ] User can type a first answer.
- [ ] Continue triggers existing `applyAdaptiveAnswer()` path.
- [ ] No side-panel form dominates the intake.
- [ ] `npm run build` passes.

### Milestone 3: Draft BodyFinding On Body Click

Goal: clicking the body creates real case state immediately.

Status: implemented with `BodyFindingStatus`, `ensureDraftBodyFinding()`, `updateBodyFinding()`, `removeBodyFinding()`, and `syncBodyRegionsFromFindings()`.

Tasks:

- [ ] Add a body finding creation helper.
- [ ] Consider adding `status?: "draft" | "confirmed"` to `BodyFinding`.
- [ ] Add `activeFindingId` state in the intake flow.
- [ ] On body click:
  - [ ] create a draft `BodyFinding`
  - [ ] set `source: "user-selected"`
  - [ ] set `quality: "unknown"` by default
  - [ ] set `activeFindingId`
  - [ ] update `bodyRegions` compatibility list
  - [ ] highlight/focus selected body region
- [ ] If the same region is clicked again:
  - [ ] reopen existing draft if one exists
  - [ ] do not create confusing duplicates by default
- [x] Add remove/edit actions.
- [ ] Preserve ability to add another body area later.
- [x] Update system docs for body finding editing.

Suggested helper:

```text
src/lib/body-findings.ts
```

Possible helper functions:

```ts
createDraftBodyFinding(region, source, now)
upsertBodyFinding(caseGraph, finding)
syncBodyRegionsFromFindings(caseGraph, language)
confirmBodyFinding(caseGraph, findingId)
```

Acceptance:

- [ ] Clicking head creates `caseGraph.bodyFindings[0]`.
- [ ] The finding is draft and user-selected.
- [ ] Body region stays highlighted.
- [ ] The finding appears in selected findings UI.
- [x] The finding can be refocused or removed from Atlas body-area chips.
- [ ] Text-only intake still works.
- [ ] `npm run build` passes.

### Milestone 4: Natural Text/Voice Inference Creates Inferred Drafts

Goal: natural answers and voice answers create useful body context before body touch.

Status: implemented for the shared text/voice answer pipeline. Automated phrase tests are still deferred.

Tasks:

- [ ] Export or reuse `inferRegion()` from `src/lib/agent-flow.ts`.
- [ ] When text/voice answer implies a region:
  - [ ] create an inferred draft `BodyFinding` if no active matching finding exists
  - [ ] set `source: "inferred"`
  - [ ] highlight/focus the region
  - [ ] show prompt to touch or confirm the area
- [ ] If user clicks the inferred region:
  - [ ] upgrade source to `user-selected`
  - [ ] keep same finding id when practical
- [ ] Infer severity from natural language when present.
- [ ] Keep deterministic safety running after each answer.
- [ ] Add tests or lightweight checks for common phrases:
  - [ ] `I feel bad of head`
  - [ ] `my head hurts`
  - [ ] `chest tightness`
  - [ ] `stomach pain`
  - [ ] `dolor de cabeza`
  - [ ] `me falta el aire`

Acceptance:

- [ ] `I feel bad of head` highlights head.
- [ ] Inferred draft body finding is present.
- [ ] Clicking the body upgrades it.
- [ ] Chest/breathing language still triggers safety as before.
- [ ] `npm run build` passes.

### Milestone 5: CopilotKit Multiple-Choice Floating Questions

Goal: make CopilotKit drive the question UX while preserving Atrium floating cards.

Status: implemented as custom floating question cards backed by `/api/intake-ui`, with CopilotKit provider/readable context wired for the active Body View state.

Tasks:

- [ ] Define the custom floating question contract:
  - [ ] speaker
  - [ ] question
  - [ ] four choices
  - [ ] one open answer option
  - [ ] optional none/not sure
  - [ ] UI mode
  - [ ] priority
- [ ] Keep CopilotKit as the composer/integration layer.
- [ ] Do not expose a generic CopilotKit sidebar as the primary UX.
- [ ] Render choices as buttons inside the floating message.
- [ ] Add `Something else...` as the open option.
- [ ] Expand open option inline into a small text input.
- [ ] Submit choice/open answer through the same answer pipeline.
- [ ] Prevent empty open answer submission.
- [ ] Keep the first question able to accept free text.
- [ ] After the first answer, prefer guided choices plus open answer.

Files likely touched:

```text
src/components/body-view/FloatingQuestionCard.tsx
src/components/body-view/FloatingChoiceGrid.tsx
src/components/new-entry/NewEntryFlow.tsx
src/app/api/intake-ui/route.ts
src/app/api/copilotkit/route.ts
```

Acceptance:

- [ ] Follow-up questions appear as floating cards.
- [ ] Each active question has four quick choices.
- [ ] Open answer works and routes correctly.
- [ ] Choice answer updates `CaseGraph`.
- [ ] UI never falls back to a full-page form during intake.
- [ ] `npm run build` passes.

### Milestone 6: Body Finding Editor Floating Card

Goal: let the user complete the draft finding without leaving the Body View.

Status: implemented in the Body View as `BodyFindingEditor`.

Tasks:

- [ ] Create `BodyFindingEditor` floating card.
- [ ] Show active region label.
- [x] Add progressive subregion selector for the active region.
- [x] Make zoomed 3D subregions clickable for the active region.
- [ ] Add severity selector from 0 to 10.
- [ ] Add quality chips:
  - [ ] pressure
  - [ ] sharp
  - [ ] burning
  - [ ] cramping
  - [ ] numbness
  - [ ] unknown
  - [ ] something else
- [ ] Add optional note field for `something else`.
- [ ] Allow `Not sure`.
- [ ] Mark finding confirmed when enough user input exists.
- [ ] Keep draft visible but labeled if incomplete.
- [ ] Allow removing active finding.
- [ ] Allow adding another area.
- [ ] Make controls keyboard accessible.
- [ ] Make severity not color-only.

Acceptance:

- [ ] User can click head.
- [x] User can pick a precise subregion after choosing a body area.
- [x] User can pick or clear a precise subregion directly from the zoomed 3D body.
- [ ] User can select pressure.
- [ ] User can set severity 7/10.
- [ ] Finding updates in `caseGraph.bodyFindings`.
- [ ] Final formatted context includes the finding.
- [ ] `npm run build` passes.

### Milestone 7: Body Findings In `/api/intake-ui` And Copilot Context

Goal: make body input affect the next question.

Status: implemented. Client sends `bodyFindings` and `bodyFindingsContext`; route prompt and fallback use body context as user-reported, non-diagnostic context. A guardrail layer now selects the next required slot before provider generation, stores a question ledger, redirects off-topic and diagnosis/prescription requests, blocks repeated questions, and caps active Atlas questions at 8.

Tasks:

- [ ] Add `bodyFindings` to intake payload type.
- [ ] Add `bodyFindingsContext` to intake payload type.
- [ ] Send both from the client.
- [ ] Use `bodyFindingsToPromptContext()` before calling route.
- [ ] Update route prompt:
  - [ ] body findings are user-reported context
  - [ ] body findings are not diagnostic findings
  - [ ] use body findings to choose next question
  - [ ] still return four quick choices
- [ ] Update fallback UI to consider body findings when latest answer is sparse.
- [ ] Keep empty body findings safe.
- [ ] Update system docs for AI context contract.

Acceptance:

- [ ] Body click followed by Continue sends body context.
- [ ] Route prompt includes body findings.
- [ ] Empty body findings still work.
- [ ] Model/fallback can ask a better second question based on selected body area.
- [ ] `npm run build` passes.

### Milestone 8: Voice Input Into Same Pipeline

Goal: voice behaves like text, not a separate demo path.

Status: implemented through browser speech recognition where supported, with text fallback when unsupported.

Tasks:

- [ ] Add mic control to the first floating message.
- [ ] Add mic control to open-answer mode if useful.
- [ ] Convert transcript into the same answer submission function used by typed text.
- [ ] Infer body region from voice transcript.
- [ ] Create inferred draft finding when appropriate.
- [ ] Show transcript before or after submission depending on UX decision.
- [ ] Handle unsupported speech recognition gracefully.
- [ ] Keep privacy copy clear: no PHI-heavy assumptions, no recording claims unless implemented.

Acceptance:

- [ ] Voice transcript can start the check.
- [ ] Voice transcript can infer a region.
- [ ] Unsupported browsers still show text input.
- [ ] `npm run build` passes.

### Milestone 9: Safety Floating Cards And Visual State

Goal: make deterministic safety visible inside the Body View.

Status: implemented as a floating safety card driven by deterministic safety state.

Tasks:

- [ ] Map safety level to Body View state:
  - [ ] none
  - [ ] routine
  - [ ] watch
  - [ ] urgent
  - [ ] emergency
- [ ] Show floating safety card when deterministic rules trigger.
- [ ] Ensure emergency state can interrupt the normal question sequence.
- [ ] Add visual status without overloading the body with alarm colors.
- [ ] Keep urgent copy calm and non-diagnostic.
- [ ] Prevent model responses from downgrading safety.
- [ ] Ensure body selection alone does not trigger urgent language.

Acceptance:

- [ ] Chest plus breathing language triggers visible safety flow.
- [ ] Safety card appears over Body View.
- [ ] Emergency copy tells user to seek local emergency care.
- [ ] `npm run build` passes.

### Milestone 10: Final Review Large Card

Goal: transition from intake to review mode.

Status: implemented by expanding `AssessmentPage` into a large review report that includes body findings and reported context.

Tasks:

- [ ] Create `FinalReviewWorkspace` or equivalent.
- [ ] Trigger final review from:
  - [ ] model says complete
  - [ ] question count limit
  - [ ] user chooses finish assessment
  - [ ] emergency flow when appropriate
- [ ] Make review card occupy most screen space.
- [ ] Fade, shrink, or hide body scene.
- [ ] Include review sections:
  - [ ] safety status
  - [ ] reported symptoms
  - [ ] body findings
  - [ ] severity/quality
  - [ ] timeline
  - [ ] missing info
  - [ ] clinician questions
  - [ ] next steps
  - [ ] care instructions
  - [ ] urgent care instructions if deterministic safety says so
- [ ] Add return actions:
  - [ ] edit body findings
  - [ ] add another answer
  - [ ] dashboard/records
  - [ ] new check
- [ ] Keep copy explicitly non-diagnostic.

Acceptance:

- [ ] Final review uses almost all available space.
- [ ] Body is no longer the main visual focus.
- [ ] Body findings are readable in final review.
- [ ] Safety status is clear.
- [ ] `npm run build` passes.

### Milestone 11: Dashboard Records WIP

Goal: preserve the Dashboard path without overbuilding records.

Status: implemented as the Entry View `Dashboard` route to the records/history WIP surface. The surface now lives in `src/components/records/RecordsDashboard.tsx` and is opened through the URL-backed `AppShell` view state.

Tasks:

- [ ] Route Entry View `Dashboard` to records/history WIP.
- [ ] Show current saved check history if available.
- [ ] Show clear WIP state for unfinished records features.
- [ ] Allow opening a previous check.
- [ ] Do not make Dashboard compete with Body View as the main product center.

Acceptance:

- [ ] Dashboard route works.
- [ ] Existing local history is not broken.
- [ ] WIP is clear but polished.
- [ ] `npm run build` passes.

### Milestone 12: Atrium Care Team As Reactive Visualization

Goal: use Atrium care-team delight without making it the logic owner.

Status: deferred after the first vertical slice.

Tasks:

- [ ] Decide if care team ships in first pass or second pass.
- [ ] If included, map regions/UI modes to active specialist:
  - [ ] head/neurologic -> Synapse
  - [ ] chest/heart -> Pulso
  - [ ] breathing/lungs -> Aire
  - [ ] abdomen/digestive -> Vesta
  - [ ] back/limbs/skeleton -> Vitrum
  - [ ] overall flow -> Atlas
- [ ] Drive care-team animation from `CaseGraph` and current UI mode.
- [ ] Keep it visual only.
- [ ] Do not let care-team scripted copy replace AiThinkers adaptive logic.
- [ ] Keep optional if it slows the core merge.

Acceptance:

- [ ] Care team reacts to body region or question mode.
- [ ] It does not own medical logic.
- [ ] App remains usable without it.
- [ ] `npm run build` passes.

## Component Architecture Proposal

Recommended component tree:

```text
src/app/page.tsx
  AppShell
    EntryView
    BodyView
      BodyScene
      FloatingMessageLayer
        FloatingQuestionCard
        FloatingChoiceGrid
        FloatingOpenAnswer
        BodyFindingEditor
        FloatingSafetyCard
      BodyStatusDock
    FinalReviewWorkspace
    RecordsDashboard
```

Recommended supporting helpers:

```text
src/lib/body-findings.ts
  createDraftBodyFinding()
  upsertBodyFinding()
  confirmBodyFinding()
  syncBodyRegionsFromFindings()
  bodyFindingsToPromptContext()

src/lib/agent-flow.ts
  inferRegion()
  applyAdaptiveAnswer()
```

## Data Contract Details

### BodyFinding

Recommended evolution:

```ts
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

Current `BodyRegion` includes:

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

### Floating Question

Recommended client type:

```ts
export type FloatingQuestion = {
  id: string;
  speaker: "Atlas" | "Synapse" | "Pulso" | "Aire" | "Vesta" | "Vitrum";
  question: string;
  choices: string[];
  openAnswerLabel: string;
  allowNone?: boolean;
  allowNotSure?: boolean;
  mode: "body_locator" | "severity_scale" | "timeline" | "red_flags" | "medication_history";
  priority: "routine" | "watch" | "urgent";
};
```

## UI Rules

- Body View is the main stage for active intake.
- Floating messages are the only major active-intake UI pattern.
- Cards should be compact during intake.
- Final review is intentionally large.
- Avoid side panels that make intake feel like a dashboard.
- Use icon buttons for mic, close, back, and edit where possible.
- Keep text inside buttons short enough for mobile.
- Keep body controls accessible through keyboard/list alternatives.
- Keep color meaningful but never the only indicator.

## Safety And Privacy Rules

- Do not diagnose.
- Do not prescribe.
- Do not claim emergency triage certainty beyond deterministic rules.
- Do not collect unnecessary PHI.
- Treat all body findings as user-reported symptom context.
- Deterministic safety rules override AI-generated flow.
- AI-generated text must stay educational, intake-oriented, and visit-prep oriented.

## Verification Plan

Run after every meaningful implementation milestone:

```powershell
npm run build
```

Run when lint is stable/available:

```powershell
npm run lint
```

Manual checks:

- [ ] Entry View opens.
- [ ] New Check opens Body View.
- [ ] First floating message appears.
- [ ] User can type first.
- [ ] User can click body first.
- [ ] Body click creates draft finding.
- [ ] Multiple-choice question appears.
- [ ] Open answer path works.
- [ ] Severity/quality editor works.
- [ ] Body findings reach `/api/intake-ui`.
- [ ] Safety card interrupts when needed.
- [ ] Final review occupies most of the screen.
- [ ] Dashboard/Records WIP opens.
- [ ] Mobile layout has no overlapping text or controls.

## Open Decisions

- [x] Should `status: "draft" | "confirmed"` be added to `BodyFinding`, or should draft state be inferred from missing fields?
  - Decision: add explicit `status?: "draft" | "confirmed"`.
- [x] Should the first pass port Atrium's full `HumanBody3D`, or upgrade the existing React Three Fiber `BodyInteractionModel`?
  - Decision: reuse Atrium's original `HumanBody3D` and keep `BodyInteractionModel` as the AiThinkers region-mapping wrapper.
- [x] Should care-team animation ship in the first merge or after the core body finding loop?
  - Decision: ship after the core body finding loop.
- [x] Should the body stay visible behind the final review as atmosphere, or fully disappear?
  - Decision: final review becomes the primary workspace; body is no longer relevant in this mode.
- [x] Should `Dashboard` be renamed `Records` now, or stay `Dashboard` while records are WIP?
  - Decision: keep `Dashboard` while showing `Records WIP` as the subtitle.
- [x] Should open answer always be labeled `Something else...`, or should CopilotKit generate the label?
  - Decision: keep stable label `Something else...` for the first slice.

## First Vertical Slice

Build this first:

- [x] Entry View with `New Check` and `Dashboard`.
- [x] Body View with floating first message.
- [x] Body click creates draft `BodyFinding`.
- [x] Floating multiple-choice card appears after body click.
- [x] Severity/quality editor updates the finding.
- [x] `/api/intake-ui` receives body findings context.
- [x] Final review still works through existing assessment path.

This slice proves the product direction without waiting for care-team animation, organ visualizers, full records, or a perfect anatomy model.
