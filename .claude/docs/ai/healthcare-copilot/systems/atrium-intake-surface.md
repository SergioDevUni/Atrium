# Atrium Body View Surface

## Purpose

The Atrium Body View Surface is the visible healthcare UX shell for AiThinkers. It replaces the older HQ-style intake surface with a direct product flow:

```text
Entry View
  New Check -> Body View
  Dashboard -> Records WIP

Body View
  body as the main scene
  floating guided messages
  text, voice, or body-click input
  draft body findings created immediately

Final Review
  Atlas-style review workspace
  dim body model behind the report
  sticky save / continue / dashboard actions
```

AiThinkers remains the healthcare intelligence engine: case graph, body findings, deterministic safety, `/api/intake-ui`, `/api/copilotkit`, patient advice, and records/history.

## Why This Exists

The target product direction is Atrium as the UX/UI layer and AiThinkers as the implementation logic. The earlier surface made the app feel like a dashboard before it felt like a body-first healthcare check. The current version makes the desired flow visible from the first screen and keeps active intake inside the Body View instead of a form or sidebar chat.

The visual donor remains Atrium, but the production app does not copy office metaphors, Remotion/video features, or non-healthcare simulation language.

The active palette is a medical-grade Atrium system, not a generic blue-and-white healthcare palette. It uses deep charcoal clinical surfaces, cyan for interaction and body selection, soft green only for stable safety state, amber for soon/caution state, red only for immediate emergency state, and warm gold for review emphasis or primary review actions.

## User Flow

1. User opens the app.
2. The existing app navbar remains in place on Entry View and Dashboard, with colors aligned to the Atrium dark/gold/cyan palette.
3. Entry View centers the two primary choices: `New Check` and `Dashboard`.
4. Entry View does not render the ambient SVG map/background layer.
5. `New Check` starts Body View.
6. Body View opens with the floating Atlas message: `What brings you in today?`
7. User can type, use the mic control, or click a body region first.
8. Clicking a body region creates a draft `BodyFinding` immediately and highlights the region.
9. Follow-up questions appear as floating multiple-choice cards with four focused choices, one open answer path, and one smart none/not-applicable path.
10. User can use `Zoom out` to reset the zoomed body camera without deleting the selected finding.
11. User can use `Close detail` to clear active optional details/focus without removing the body area from the case graph.
12. The bottom body-region shortcut row acts as a toggle surface: active shortcut clicks remove that area from the map.
13. Atlas includes the selected body-area strip, so mapped areas live inside the active question card and each chip supports refocus/edit plus `X` removal.
14. Atlas embeds optional details for the active body area under the question answers.
15. `Where exactly?` is a closed optional dropdown by default and opens only when the user clicks it.
16. When a body region is zoomed, the original Atrium model renders matching body-surface subregion zones so the precise part can be visually distinguished and clicked directly.
17. Safety state appears as a floating card when deterministic rules trigger.
18. Final review uses a large Atlas-style workspace with reported symptoms, body findings, safety status, care instructions, and non-diagnostic next-step guidance.
19. The body model remains visible as a dim, non-interactive background layer so the review keeps visual continuity without competing with the report.
20. `Continue review` returns to a useful follow-up question when the review needs more detail, while still respecting the hard 10-question cap.
21. `Dashboard` opens the records/history WIP path.

## Technical Flow

`src/app/page.tsx` resolves the initial URL view and renders `AppShell`.

`src/components/app-shell/AppShell.tsx` owns the app-level view switch:

```text
home      -> EntryView
check     -> NewEntryFlow Body View
dashboard -> RecordsDashboard
```

The shell stores the view in the URL query string:

```text
/                -> Entry View
/?view=check     -> Body View
/?view=dashboard -> Dashboard
```

Browser Back and Forward are handled through `popstate`, so the main app navigation behaves like a real product workspace even before these states become separate route segments.

`NewEntryFlow` now renders the Body View directly:

```text
BodyInteractionModel
FloatingQuestionCard
AtlasBodyAreaStrip
BodyFindingEditor
BodyRegionButtons
floating safety card
AssessmentPage
```

`BodyInteractionModel` now wraps the original Atrium `HumanBody3D` scene copied from:

```text
C:\Users\serch\OneDrive\Escritorio\Hackatons\AtriumOriginalCode\Atrium\apps\frontend\src\components\clinic\HumanBody3D.tsx
```

The wrapper maps Atrium's richer region ids into AiThinkers `BodyRegion` values. Hands and feet are first-class selectable regions because wrist, palm, finger, ankle, toe, swelling, numbness, burn, and injury reports are clinically meaningful intake context.

```text
heart, lungs, torso_chest -> chest
brain, head -> head
torso_abdomen, stomach, liver, kidneys, pelvis -> abdomen
arm_left -> leftArm
hand_left -> leftHand
leg_right -> rightLeg
foot_right -> rightFoot
```

The original navbar should remain unchanged. The Entry View must not introduce a second competing navigation header.

The visible guided question UI is custom Atrium floating UI. CopilotKit is wired at the React root through `AtriumCopilotProvider`, and Body View publishes its current state through `useCopilotReadable`. `/api/intake-ui` remains the route that composes the next structured question payload for the floating UI.

## Data And State

`CaseGraph` is still the source of truth. Body selections now mutate case state immediately through helpers in `src/lib/body-findings.ts`.

Important Body View state:

```ts
firstAnswer: string;
selectedChoice: string;
otherAnswer: string;
previewRegion: BodyRegion | null;
focusedRegion: BodyRegion | null;
activeFindingId: string | null;
currentUi: IntakeUiResult | null;
assessment: AssessmentResult | null;
isRouting: boolean;
isListening: boolean;
```

Body click flow:

```text
handleBodyRegionSelect(region)
-> ensureDraftBodyFinding({ source: "user-selected" })
-> setActiveFindingId()
-> setFocusedRegion()
-> setCurrentUi(regionQuestion(region))
```

Focus controls:

```text
Zoom out   -> clears focusedRegion only
Close detail -> clears activeFindingId, previewRegion, and focusedRegion
Remove     -> deletes the active BodyFinding
Atlas chip X -> deletes that BodyFinding, removes matching stale bodyRegions state, and clears that area's local prompt
Active shortcut -> deletes that region's BodyFinding/bodyRegions state and clears that area's local prompt
Escape     -> reset view first, then deselect if pressed again
```

Visible Body View panels are placed by a responsive HUD over the full-bleed Atrium model. Desktop uses fixed visual lanes: `Zoom out`/`Close detail` controls above the left question card, the compact Body map badge in the top-center lane, original Atrium model modes above the lower center, centered body-region shortcuts, and the safety notice when triggered. The old bottom `areas mapped / answers / Final review` status dock is removed. Selected areas and optional body details are inside Atlas, so the right lane no longer duplicates the question flow with a separate map/editor panel.

Natural text or voice flow:

```text
submit answer
-> applyAdaptiveAnswer()
-> inferRegion()
-> ensureDraftBodyFinding({ source: "inferred" })
-> routeAnswer()
-> /api/intake-ui receives bodyFindings and bodyFindingsContext
```

Finding editor updates:

```text
updateBodyFinding()
-> can store stable subregion ids from body-location-taxonomy
-> status becomes confirmed when quality or severity is known
-> syncBodyRegionsFromFindings()
```

Subregions appear progressively inside the active Atlas optional details and as focused 3D surface zones inside `HumanBody3D`. Precise location, severity, and symptom quality are all optional closed dropdowns in Atlas. The `Where exactly?` control only reveals options after the user clicks it. Subregions are not always-on model hitboxes. The visual layer uses rounded high-contrast surface patches for torso/back, capsule bands for limbs/fingers/toes, and small anatomical patches for hands, feet, and head details. Each patch includes a larger backing rim so the subregions remain merged with the subject while still being completely visible enough for users to understand the selectable parts. Head/face patches are intentionally smaller and depth-aware because that region contains overlapping concepts: general face selection is represented by cheek patches, while eyes, nose/sinus, mouth/jaw, top, back, ears, and neck keep separate non-stacked zones. Current Level 2 precision:

```text
head: 9
chest: 6
abdomen/stomach: 9
back: 8
each arm: 2
each hand: 7
each leg: 2
each foot: 6
```

## Files

```text
src/app/page.tsx
src/app/layout.tsx
src/app/globals.css
src/components/AtriumCopilotProvider.tsx
src/components/app-shell/AppShell.tsx
src/components/app-shell/AppTopbar.tsx
src/components/entry-view/EntryView.tsx
src/components/records/RecordsDashboard.tsx
src/components/new-entry/NewEntryFlow.tsx
src/components/new-entry/AtlasBodyAreaStrip.tsx
src/components/new-entry/BodyInteractionModel.tsx
src/components/new-entry/HumanBody3D.tsx
src/components/new-entry/AssessmentPage.tsx
src/lib/body-findings.ts
src/lib/body-location-taxonomy.ts
src/lib/types.ts
src/lib/agent-flow.ts
src/app/api/intake-ui/route.ts
src/app/api/copilotkit/route.ts
```

Related docs:

```text
.claude/docs/ai/healthcare-copilot/systems/new-entry-flow.md
.claude/docs/ai/healthcare-copilot/systems/app-shell.md
.claude/docs/ai/healthcare-copilot/systems/body-first-intake.md
.claude/docs/ai/healthcare-copilot/systems/TaskList/atrium-body-view-copilotkit-merge-plan.md
```

## UI And Accessibility Notes

- Entry View must stay direct and app-like, not a marketing hero.
- Preserve the existing navbar/topbar structure while matching the Atrium palette.
- `New Check` and `Dashboard` are the only dominant opening actions.
- Center `New Check` and `Dashboard` in the main page content area below the navbar.
- Keep Entry View visually clean without the old ambient healthcare map background.
- Body View should feel like interacting with the body scene, not filling out a form.
- Atlas body-area chips must be actionable: the main chip refocuses the area, and the `X` removes it from the map.
- Body-region shortcuts use toggle semantics with `aria-pressed`: inactive adds/focuses, active removes.
- Precise subregions, severity, and symptom quality are optional after a normal body area is active. The whole optional detail editor starts as a closed `Optional details / Selected area` dropdown, and the individual controls stay hidden behind nested Atlas dropdowns, so the default view remains fast and uncluttered.
- Atlas scrollbars use the same dark cyan/gold visual language as the body-view controls.
- Zoomed 3D subregion surfaces must write to the same `BodyFinding.subregion` state as the editor buttons.
- `Whole area` clears the subregion when the user does not want more precision.
- `Zoom out` must not delete or close the active finding.
- `Close detail` must close active focus/editor state without deleting the finding.
- Floating cards are compact during intake.
- Final review is intentionally large.
- Final review should use most of the available screen, place care instructions before next steps, and keep sticky actions visible.
- The final review body backdrop must be non-interactive and visually secondary.
- Region buttons remain a keyboard-accessible alternative to the 3D body.
- Atlas guided questions use a six-button answer contract: four focused choices, `Something else...`, and one slot-aware none/not-applicable choice.
- Desktop Body View should reserve separate HUD areas for the question card with selected area chips and optional details, `Zoom out`/`Close detail` controls, body badge, model modes, region buttons, and safety card.
- Text input remains available even when voice or body interaction is unsupported.
- The mic button gracefully falls back when browser speech recognition is unavailable.
- Safety status uses text labels as well as color.
- Color tokens should stay semantic: cyan means interaction/selection, green means no urgent warning signs, amber means check soon/caution, red means emergency, and gold means review emphasis. Do not use red for routine errors or decorative accents.
- Shadows should stay restrained: panels use soft depth to separate layers, not large SaaS-style glows.
- Lines should do most of the structure work. Use quiet borders for passive surfaces and stronger cyan/gold borders only for active or actionable elements.

## Safety And Privacy Notes

Body findings are user-reported symptom-location context. They are not diagnostic findings, detected disease, or proof of a condition.

Deterministic safety rules remain authoritative. Body selection alone must not create urgent or emergency guidance unless user language and local safety logic support it.

Final review copy must stay educational, intake-oriented, and visit-prep oriented.

The color system must not imply diagnosis certainty. Stable green means no emergency warning signs in the current answers, not that the user is medically cleared.

## Acceptance Checks

Automated:

```text
npm run build
```

Manual:

1. Open the app and confirm the original navbar/topbar structure is still present.
2. Confirm the navbar uses the dark Atrium palette rather than the older light header.
3. Confirm Entry View centers `New Check` and `Dashboard`.
4. Confirm there is no ambient SVG map/background behind the buttons.
5. Select `New Check`.
6. Confirm Body View appears with the original Atrium `HumanBody3D` model and floating Atlas message.
7. Click a body region and confirm a draft finding appears.
8. Click left/right hand and left/right foot and confirm each can become its own draft finding.
9. Click `Zoom out` and confirm the body zoom exits while the finding remains active.
10. Click `Close detail` and confirm the editor closes while the finding remains in the list.
11. Click an Atlas body-area chip and confirm the area refocuses/reopens.
12. Click the Atlas body-area chip `X` and confirm the body area disappears instead of becoming a stale observed region.
13. Click an active body-region shortcut again and confirm the body area disappears from the map.
14. Confirm `Where exactly?` is closed by default after a body area is selected.
15. Open `Where exactly?`, pick a precise subregion, and confirm Atlas body-area chips and final review show it.
16. While zoomed into that region, confirm the 3D subregion surfaces are visible, click one, and confirm the Atlas optional detail selection changes.
17. Click the same precise 3D subregion again and confirm it clears back to `Whole area`.
18. Confirm the body-view HUD panels and region shortcuts do not overlap at desktop and mobile widths.
19. Submit a guided choice and confirm the next floating question appears.
20. Use `Something else...` and confirm the inline open answer submits.
21. Update severity or quality and confirm the finding becomes confirmed.
22. Finish the flow and confirm the final review workspace shows reported body findings.
23. Confirm the dim body backdrop, care instructions, next steps, and sticky review actions render without overlap.
24. Click `Continue review` before the hard cap and confirm a targeted Atlas follow-up question opens.
25. Open Dashboard and confirm the records WIP path still renders.

## Open Questions

- Should care-team animation ship as a reactive visual layer after the core intake flow is stable?
- Should the final review eventually support export/share once privacy and record ownership are ready?
