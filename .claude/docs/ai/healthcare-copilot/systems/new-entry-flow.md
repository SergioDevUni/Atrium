# New Entry Flow

## Purpose

New Entry Flow owns the active `New Check` experience after the user chooses it from Entry View. It now behaves as the Atrium Body View: body-first intake, floating guided questions, body finding editing, safety interruptions, and transition into final review.

## Why This Exists

`src/app/page.tsx` should own the workspace shell and records/dashboard navigation. `NewEntryFlow` owns the active check so the intake can evolve without turning the page component back into a large mixed-responsibility file.

This flow also keeps the important product split clear:

```text
Atrium = visible Body View UX
AiThinkers = case graph, adaptive extraction, safety, provider routes, records
```

## User Flow

1. User selects `New Check` from Entry View.
2. `CaseWorkspace` starts or resumes the current `CaseGraph`.
3. The global `AppTopbar` remains visible with `New Check` active.
4. `NewEntryFlow` renders Body View with the body scene and floating Atlas card.
5. User can type, speak, or click a body region first on the original Atrium `HumanBody3D` model.
6. Body clicks create draft `BodyFinding` records immediately.
7. Natural text or voice answers can infer a region and create an inferred draft finding.
8. Follow-up questions render as floating multiple-choice cards with four focused choices, one inline open answer option, and one smart none/not-applicable option.
9. Atlas question cards only advance the current answer path. They do not include a `Review now` action, and Body View no longer shows a bottom `areas mapped / answers / Final review` status bar.
10. Greeting-only text such as `Hi gemini` shows a friendly opening reprompt and is not recorded as symptom narrative.
11. Off-topic or diagnosis/prescription requests show a scope redirect card and are not recorded as symptom narrative.
12. Atlas embeds optional details for the active body area under the answer controls.
13. The bottom body-region shortcuts act as toggles: clicking an inactive shortcut adds/focuses the area, and clicking an active shortcut removes that area from the map.
14. The Atlas card now contains the selected body-area strip. Each area chip can refocus/edit the area or remove it with `X`.
15. `Where exactly?` is a closed optional dropdown by default and opens only when the user clicks it.
16. Deterministic safety appears inside the Body View when triggered.
17. When the route returns an assessment or the fallback completes, `AssessmentPage` renders an Atlas-style final review workspace that uses most of the screen and keeps a dim, non-interactive body model in the background.
18. The final review keeps the header summary, then shows reported context, care instructions, next steps, and safety watchouts in plain user language.
19. Sticky review actions let the user save the review, continue the review for more detail, open Dashboard, or start a new check.
20. `Save review` persists the reviewed snapshot through App Shell storage and clears the active draft.

## Technical Flow

`CaseWorkspace` remains the state owner for:

```text
language
caseGraph
current workspace view
dashboard/history state
```

`NewEntryFlow` owns transient active-check UI state:

```text
firstAnswer
selectedChoice
otherAnswer
previewRegion
focusedRegion
activeFindingId
currentUi
assessment
isRouting
isListening
```

The answer pipeline is shared by typed, voice, and guided-choice input:

```text
answer
-> classifyIntakeScope()
-> opening reprompt when greeting-only
-> scope redirect when off-topic or boundary-breaking
-> applyAdaptiveAnswer()
-> markCurrentQuestionAnswered()
-> inferRegion() / inferSeverity()
-> ensureDraftBodyFinding()
-> routeAnswer()
-> /api/intake-ui
-> currentUi or AssessmentPage
```

`handleBodyRegionSelect()` supports the body-click-first path:

```text
region click
-> ensureDraftBodyFinding(source: "user-selected")
-> activeFindingId = finding.id
-> focusedRegion = region
-> currentUi = local region question
```

Body View separates three related concepts:

```text
selected finding -> durable CaseGraph.bodyFindings entry
active finding   -> the finding currently open in the editor
focused region   -> the 3D camera zoom target
```

`Zoom out` clears only `focusedRegion`, so the user can return to the full-body view while keeping the active Atlas optional details available.

`Close detail` clears `activeFindingId`, `previewRegion`, and `focusedRegion`, but does not remove the durable body finding.

`Remove` deletes the active finding from `CaseGraph.bodyFindings`.

Atlas body-area chip removal deletes the selected finding, clears any matching legacy `bodyRegions` entry, and closes that area's local body-location prompt when it is the current question.

`BodyRegionButtons` uses `aria-pressed` and delegates shortcut clicks to `NewEntryFlow`. `NewEntryFlow` treats an active shortcut click as a remove action and an inactive shortcut click as a normal body-region selection. Direct 3D body clicks still select or refocus a body region.

`BodyFindingEditor` renders inside the Atlas question card as one closed `Optional details` dropdown for the active area. Its summary shows `Selected area: {region}` and a short hint that the section can be ignored. Inside that optional section, `Where exactly?`, `How strong is it?`, and `What does it feel like?` are also explicitly marked optional and render as closed dropdown disclosures by default. Each nested dropdown summary shows its current value, so the user can skip the control without opening it. The precise location dropdown keeps `Whole area` selected unless the user opens it and chooses a smaller part. The editor stores stable ids in `BodyFinding.subregion`, and `formatBodyFinding()` resolves those ids into localized labels for Atlas body-area chips, final review, and prompt context.

`HumanBody3D` now mirrors those same subregions as focused 3D surface zones. The zones stay hidden in the default full-body view, render on the body surface while a region is zoomed, and call `handleBodySubregionSelect()` so canvas clicks and editor buttons write to the same `BodyFinding.subregion` field. Torso/back zones use rounded surface patches, limb zones use translucent capsule bands, and small distal areas use hand, finger, foot, and toe patches. Each visible zone uses a high-contrast fill plus a slightly larger backing rim so the selectable pieces read as merged anatomy, not floating boxes, while still being easy to see. Head and face zones use smaller depth-aware patches so forehead, eye area, cheek/face, nose, mouth/jaw, ears, top, back, and neck do not stack into an unreadable mask.

`Escape` first resets the zoomed camera view. Pressing it again deselects the active area.

The desktop Body View layout sits below the global navbar and uses a single HUD grid over the full-bleed body scene:

```text
top-center local status badge
top-left body controls | body scene
question card with body chips and optional details | body scene
centered region shortcuts
bottom safety notice only when triggered
```

Global app navigation lives in `AppTopbar`; Body View does not duplicate Home/Dashboard/Condition Tree controls.

On tablet and mobile, the scene renders first, then controls, the Atlas question with selected body-area chips and optional details, region chips, and any safety notice in normal document flow.

The global navbar, local `New Check / Body View` badge, `Zoom out`/`Close detail` controls, original Atrium model mode switcher, region shortcuts, and safety notice must stay in separate vertical lanes at desktop widths. The region shortcuts are centered across the lower HUD so they do not sit under the question card. Atlas question cards should not include a secondary review button, which keeps the floating question focused on answering.

## CopilotKit Contract

The React tree is wrapped by `AtriumCopilotProvider`, which points to `/api/copilotkit`.

`NewEntryFlow` publishes the current Body View state through `useCopilotReadable`:

```text
language
latestAnswer
currentQuestion
questionCount
safetyLevel
bodyFindings
bodyFindingsContext
```

The visible UI is intentionally custom Atrium floating UI, not a generic CopilotKit sidebar. `/api/intake-ui` returns the structured next-question contract used by the floating card.

`src/lib/intake-guardrails.ts` owns scope classification, the question ledger, the next-slot decision, question repetition checks, and question caps. `NewEntryFlow` runs scope classification before applying answers, while `/api/intake-ui` repeats the guardrail checks before accepting provider output. The model is asked to phrase only the next app-selected slot.

The opening Atlas card only submits after the user types, speaks, or selects a body area. This keeps a blank first click from becoming a scope redirect and preserves the intended first flow: answer naturally, speak, or use the body first.

The opening answer is deliberately forgiving. A short rough body-area answer, including common typos like `stomatch`, should continue into the body-location/body-precision follow-up instead of showing the generic scope redirect.

Follow-up Atlas cards render exactly six answer buttons: four provider/fallback choices, `Something else...`, and a smart none/not-applicable option. The sixth option is slot-aware: examples include `No specific area`, `Whole area is fine`, `Not sure`, `No pain / not applicable`, `Not sure when`, `None of these`, and `None known`. It uses an internal sentinel value so Atlas can store safer meaning than the visible label when needed, such as adding a relevant negative for red flags without treating it as a diagnosis.

## Data And State

Props into `NewEntryFlow`:

```ts
type NewEntryFlowProps = {
  language: Language;
  caseGraph: CaseGraph;
  setCaseGraph: Dispatch<SetStateAction<CaseGraph>>;
  onCancel: () => void;
  onDashboard: () => void;
};
```

`CaseGraph.bodyFindings` is now durable state, not preview-only state. `previewRegion` marks the current focused item in the side panel, while `focusedRegion` controls only the 3D camera zoom.

`CaseGraph.currentQuestionSlot`, `CaseGraph.questionLedger`, and `CaseGraph.scopeState` are guardrail state. They prevent repeated questions and keep unrelated text out of the symptom narrative. The smart none/not-applicable choice can append a relevant negative or clear optional body precision, then the answered slot is still marked complete so Atlas does not immediately ask the same thing again.

`AtlasBodyAreaStrip` renders inside the Atlas question card. It shows `bodyFindings` first, falls back to any legacy `bodyRegions`, and includes the current `previewRegion` while the user is focused on an area. Each chip receives focus and remove callbacks from `NewEntryFlow`; the strip does not own case state directly. `AssessmentPage` receives `caseGraph` and `language` so final review can show reported body context.

`NewEntryFlow` receives `initialAssessment` from `AppShell` and reports review state through `onAssessmentChange(assessment)`. This lets `AppShell` persist a review-ready active draft and hydrate the final review back after refresh.

`AssessmentPage` also receives `onSaveRecord(caseGraph, assessment)`, `onContinueReview()`, `onStartNewCheck()`, `onDashboard()`, and `canContinueReview`. The save button disables after a successful save so repeated clicks do not create duplicate reviewed records. The continue action returns from final review into the next most useful Atlas question slot, such as body precision, severity, timing, red flags, background, or medications/allergies. It respects the hard 10-question cap through `canContinueReview`, so the app can deepen a review without opening an infinite question loop. Storage remains owned by `AppShell` and `src/lib/check-storage.ts`; `NewEntryFlow` only forwards the final review state.

`BodyFindingEditor` also renders inside the Atlas question card. It is optional and attached to the active body area. The whole editor starts collapsed as `Optional details / Selected area`, and precise location, severity, and symptom quality stay behind nested optional dropdowns so users are not overwhelmed by choices.

The final review surface is intentionally larger than the intake cards. `AssessmentPage` uses the same medical-grade Atrium palette as Body View: charcoal surfaces, cyan interaction lines, restrained shadows, gold review emphasis, soft green stable safety, amber caution, and red only for emergency. The 3D body becomes a background context layer only: it is dimmed, pointer-events are disabled, and model controls are hidden so review content and sticky actions remain the active interface. The safety pill uses plain-language status copy, such as `No urgent signs`, with a short explanation of what the user answers do or do not show. The pill lays out as an adaptive icon-plus-text block and uses specific final-review selectors so legacy assessment hero typography cannot inflate the badge text. Care instructions appear before next steps, and urgent language stays in a separate `Get help now if` section.

## Files

```text
src/app/page.tsx
src/app/layout.tsx
src/components/AtriumCopilotProvider.tsx
src/components/new-entry/AtlasBodyAreaStrip.tsx
src/components/new-entry/HumanBody3D.tsx
src/components/new-entry/BodyInteractionModel.tsx
src/components/new-entry/NewEntryFlow.tsx
src/components/new-entry/AssessmentPage.tsx
src/components/new-entry/types.ts
src/lib/body-findings.ts
src/lib/body-location-taxonomy.ts
src/lib/check-storage.ts
src/lib/intake-guardrails.ts
src/app/api/intake-ui/route.ts
```

## Safety And Privacy Notes

The flow still runs local deterministic extraction and safety logic before provider-generated UI is considered.

Body findings are user-reported symptom-location context. They must not be described as clinical findings or diagnoses.

Assessment copy remains non-diagnostic. The flow preserves fallback behavior when provider calls fail.

Final review saves are local browser persistence only. They are useful for continuity and visit preparation, but they are not a production medical record.

Final review drafts are also persisted locally before the user presses `Save review`, so refresh and Dashboard can reopen the in-progress review. Explicit save still creates the reviewed history record.

## Acceptance Checks

Automated:

```text
npm run build
```

Manual:

1. Start the app.
2. Confirm Entry View opens with `New Check` and `Dashboard`.
3. Open `New Check`.
4. Confirm the global navbar remains visible and marks `New Check` active.
5. Confirm the Body View body surface and first floating question render below the navbar.
6. Click a body region and confirm a draft finding appears.
7. Submit the local region question.
8. Confirm guided multiple-choice follow-up appears with four focused choices, `Something else...`, and one slot-aware none/not-applicable choice.
9. Confirm `Where exactly?` is closed by default after selecting a body area.
10. Click `Where exactly?`, pick a precise subregion, and confirm Atlas body-area chips show `region > subregion`.
11. Set severity or quality in Atlas optional details and confirm the finding updates.
12. Zoom into a region, confirm visible subregion surfaces render on the body, click one precise 3D subregion, and confirm the Atlas chip update.
13. Click the same precise 3D subregion again and confirm it clears back to `Whole area`.
14. Use `Zoom out` and confirm the model returns to the full-body view without deleting the finding.
15. Use `Close detail` and confirm optional details close while the selected area remains in the findings list.
16. Use an Atlas body-area chip and confirm optional details reopen for that body area.
17. Use an Atlas body-area chip `X` and confirm the finding disappears from the map and the status count updates.
18. Click an active body-region shortcut again and confirm the body area is removed from the map.
19. Confirm desktop cards, region chips, and status controls do not overlap at the default app viewport.
20. Use `Remove` in optional details and confirm the active finding is deleted.
21. Finish assessment and confirm final review renders body findings.
22. Refresh `/?view=check` and confirm the same final review renders again.
23. Open Dashboard before pressing `Save review` and confirm the active card says `Review ready`.
24. Click `Open review` and confirm the same final review opens.
25. Confirm final review uses the Atlas dark palette, the body is visible only as a dim background, and the content does not overlap the sticky action rail.
26. Confirm care instructions appear before next steps.
27. Click `Continue review` before the hard cap and confirm the app returns to a targeted Atlas follow-up question.
28. Click `Save review` and confirm the button changes to `Saved`.
29. Open Dashboard and confirm the reviewed record is visible.

## Open Questions

- Should `NewEntryFlow` be renamed internally to `NewCheckFlow` now that visible copy remains `New Check`?
- Should `AssessmentPage` move out of `new-entry` later if the same view is reused from records/history?
- Should final review expose export/share once privacy copy and record ownership are ready?
