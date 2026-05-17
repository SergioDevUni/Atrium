# Decision Log

## Decided

### Body-first intake is the direction

Decision: New Entry should feel like a body-first adaptive intake, not a classic form.

Reason: It makes the core interaction memorable and improves case graph quality.

### Atrium is the visualization layer

Decision: Atrium is not a separate app. It should become the visual layer in the healthcare app.

Reason: `CaseGraph` should remain the source of truth.

### Text-only must remain supported

Decision: Users can continue without body touch.

Reason: Accessibility, uncertainty, and lower friction.

### Use body findings as symptom context, not diagnosis

Decision: Body selections are user-reported symptom-location facts.

Reason: Safer language and clearer product boundary.

## Recommended Defaults

### V1 body granularity

Default: start with body regions that are coarse enough to stay usable, but keep hands and feet first-class.

Why: coarse first keeps the screen simple, but hands and feet are meaningfully different from arms and legs for symptoms such as numb fingers, wrist pain, palm burns, ankle swelling, toe pain, and foot injury.

Decision: `BodyRegion` includes `leftHand`, `rightHand`, `leftFoot`, and `rightFoot` in addition to arms and legs.

### Data model

Default: add `bodyFindings` instead of overloading `bodyRegions`.

Why: `bodyFindings` can carry severity, quality, source, notes, and subregion.

Decision: `bodyFindings` is implemented as a first-class `CaseGraph` array. `bodyRegions` remains available for current UI compatibility.

### Body findings serializer

Decision: body finding prompt serialization lives in `src/lib/body-findings.ts`.

Why: it keeps prompt formatting separate from the adaptive flow engine and gives the OpenRouter/Gemini integration a clean helper to reuse later.

### Pain controls

Default: severity slider plus quality chips.

Decision: body finding severity is `0-10`.

Why: `0` lets the body model represent selected areas that are abnormal but not painful, while `undefined` can still represent unknown or not answered.

Initial chips:

```text
sharp
pressure
burning
cramping
numbness
unknown
```

### UI language

Decision: keep `New Check` for the user-facing action and use `NewEntryFlow` as the internal component name.

Why: the desired product flow explicitly starts with `New Check`, while the implementation can keep the existing component naming until a later cleanup.

### Body finding status

Decision: add `status?: "draft" | "confirmed"` to `BodyFinding`.

Why: body click should create a draft immediately, and final review needs to label incomplete body input cleanly.

### Body implementation

Decision: reuse Atrium's original `HumanBody3D` scene and keep AiThinkers `BodyInteractionModel` as a wrapper that maps Atrium region ids to `BodyRegion`.

Why: the desired UX/UI is Atrium's model; AiThinkers should own the case graph and finding behavior, not replace the visual model.

### Navbar preservation

Decision: preserve the existing app navbar/topbar on Entry View and Dashboard.

Why: Body View changes should not replace the app-level navigation contract.

### Question UI shape

Decision: use custom Atrium floating cards for the visible question UI, with CopilotKit wired at the React root and Body View state published as readable context.

Why: the product should not feel like a generic sidebar chat, but CopilotKit should still be part of the question/context layer.

## Open Decisions

### Should subregions ship next?

Recommendation: no. Ship coarse regions first, but design the data model to support subregions.

Status: deferred.

### Should body findings create timeline events immediately?

Recommendation: no. Create timeline events when user continues, not on every edit.

Status: keep this recommendation.

### Should "New Check" be renamed everywhere to "New Entry"?

Decision: no for now. Keep `New Check` visible.

Status: decided.

## Questions For Sergio

1. Should subregions be added next, or should records/dashboard come first?
2. Should the selected body parts panel become collapsible on mobile?
3. Should care-team animation ship as a visual-only layer after the core flow?
