# 10x Analysis: Body-First Adaptive Intake
Session 2 | Date: 2026-05-14

## Current Value

The current healthcare app already has a strong conceptual spine:

- Home screen with Dashboard and New Check.
- Adaptive intake flow instead of a fixed long form.
- `CaseGraph` as a structured state model.
- Deterministic local extraction of symptoms, body regions, timing, severity, medical history, medications, allergies, missing info, and red flags.
- Gemini-backed `/api/intake-ui` route that chooses the next focused UI.
- Gemini-backed patient advice route for friendlier assessment copy.
- A visual body model exists in the codebase, but the intake flow does not yet make it the central interaction surface.

The core action today is: the user types an answer, the app updates case state, and the next generated question appears.

The key limitation is that intake still feels mostly like a form/chat sequence. The most important health detail, where and how the symptom feels in the body, is not yet a tactile first-class interaction.

## The Question

What would make intake 10x more valuable?

Turn the form into a body-first conversation: every question can be answered by language, touch, or both, and the body visualization becomes the living input surface.

---

## Massive Opportunities

### 1. Body-First Intake Canvas

**What**: New Check opens into a focused question screen with Atrium palette and a 3D body in the background. The question is still central, but the body responds to the answer. If the user says "I feel bad in my head," the camera/body focus moves to the head and invites them to touch the exact area and rate pain.

**Why 10x**: This changes the product from "AI asks questions" to "the app helps me explain what is happening in my body." That is more memorable, more useful, and more defensible than a better questionnaire.

**Unlocks**:
- Spatial symptom mapping.
- Lower-friction answers for users who cannot describe symptoms well.
- Better case graph quality.
- Strong demo moment.
- Future anatomy-aware follow-up questions.

**Effort**: High

**Risk**: Can imply diagnostic precision if visuals look too clinical or too certain. Must phrase as symptom mapping, not diagnosis.

**Score**: Must do

### 2. Multimodal Answer Composer

**What**: Each intake step combines typed/spoken answer + body touch + slider + optional descriptors. Example generated text sent to Gemini:

```text
User answer: "I feel bad of head."
Body selections:
- Region: head > left temple
- Pain intensity: 7/10
- Quality: pressure
- Duration: since this morning
```

**Why 10x**: Gemini gets cleaner structured context without forcing the user to write medically precise text. The user feels like they are showing the app, not filling paperwork.

**Unlocks**:
- Fewer clarifying questions.
- Better severity extraction.
- Safer red-flag evaluation.
- More accurate summaries.

**Effort**: Medium to High

**Risk**: Over-collecting too early can slow down intake. The body touch prompt should appear only when it helps answer the current question.

**Score**: Must do

### 3. Multi-Part Symptom Map

**What**: The full body remains visible when multiple areas are involved. Selected areas become colored pins or heat zones. Users can tap each part to specify pain/severity/details. The map becomes a summary of all symptom locations, not just the current question.

**Why 10x**: Many real complaints are multi-location: headache + neck stiffness, chest + arm pain, abdomen + back pain, rash across multiple areas. A normal chat buries this; a map makes it obvious.

**Unlocks**:
- Radiation paths.
- Multi-region safety rules.
- Progression over time.
- Better clinician-ready handoff.

**Effort**: High

**Risk**: Body granularity can explode. Start with coarse regions and a small number of subregions.

**Score**: Must do

---

## Medium Opportunities

### 1. Question-Aware Camera Focus

**What**: The body view reacts to the current generated UI type. Body-location questions focus the anatomy. Severity questions reveal the slider. Timeline questions shift to a timeline rail. Red-flag questions change the safety frame.

**Why 10x**: The generated UI stops feeling arbitrary. The whole screen becomes the next question.

**Impact**: Makes the app feel coherent and alive.

**Effort**: Medium

**Score**: Must do

### 2. Pain Slider Attached To Body Part

**What**: Tapping a body part opens a compact severity control: 0-10 slider, quick labels like mild/moderate/severe, and optional "sharp/pressure/burning/cramping" chips.

**Why 10x**: Severity is one of the most important details and one of the easiest to collect visually.

**Impact**: Higher-quality `CaseGraph.symptoms` and fewer follow-up questions.

**Effort**: Medium

**Score**: Must do

### 3. Gemini Context Pack

**What**: Build a deterministic text pack from body interactions and append it to the intake request. Keep the Gemini route simple: natural answer + structured body selections + current case graph.

**Why 10x**: Avoids relying on the LLM to infer from vague language. The app supplies facts.

**Impact**: Safer and more consistent generated questions.

**Effort**: Medium

**Score**: Must do

### 4. Safety-Aware Body States

**What**: Certain selections visually trigger a safety state. Example: chest + left arm + severe + breathing concern highlights urgent review. The UI stays calm but impossible to miss.

**Why 10x**: Safety becomes visible at the exact point of data entry.

**Impact**: Stronger trust and clearer boundaries.

**Effort**: Medium

**Score**: Strong

### 5. Progressive Body Granularity

**What**: Start coarse: head, chest, abdomen, back, arms, legs. When a region is selected, zoom into subregions only if useful. Head can become forehead/temple/back of head/face/neck. Abdomen can become upper/lower/left/right.

**Why 10x**: Keeps the first experience simple while supporting precise intake.

**Impact**: Prevents UI overload.

**Effort**: Medium

**Score**: Strong

---

## Small Gems

### 1. "Touch Where It Feels Wrong"

**What**: A single instruction under location questions.

**Why powerful**: It makes the body model immediately understandable without tutorial text.

**Effort**: Low

**Score**: Must do

### 2. Colored Symptom Legend

**What**: Pain/severity colors on selected regions: mild green/teal, moderate amber, severe red.

**Why powerful**: The case can be understood in one glance.

**Effort**: Low

**Score**: Strong

### 3. "Add Another Area"

**What**: After a body part is selected, show one compact button to add another affected region.

**Why powerful**: Multi-region symptoms become natural instead of hidden in free text.

**Effort**: Low

**Score**: Must do

### 4. Body Selection Summary Sentence

**What**: After touch input, show generated plain text: "Head, left temple, pressure pain, 7/10."

**Why powerful**: Users can verify what will be sent before continuing.

**Effort**: Low

**Score**: Must do

### 5. Unknown / Not Sure Option

**What**: Every body-specific prompt has "I'm not sure" so users are not forced into fake precision.

**Why powerful**: Better uncertainty handling and safer UX.

**Effort**: Low

**Score**: Must do

---

## Recommended Priority

### Do Now

1. Add an `Atrium`-style New Check screen where the first question is paired with a body visualization.
2. Make body region selection write into `CaseGraph.bodyRegions` and `CaseGraph.symptoms`.
3. Add per-region pain slider and summary sentence.
4. Append body selections to `/api/intake-ui` payload as structured text.
5. Support multiple selected regions with color states.

### Do Next

1. Question-aware visual modes: body locator, severity, timeline, red flags, medication/history.
2. Subregion maps for head, chest, abdomen, back, arms, and legs.
3. Safety-aware body highlights.
4. Review-ready Atrium tab showing all selected areas and missing info.

### Explore

1. Voice plus body interaction: "my head hurts" focuses head, then the user taps exact area.
2. Body history over time: color changes as symptoms improve/worsen.
3. Clinician handoff export with body-map screenshot and structured symptom table.

### Backlog

1. Organ-level internal anatomy. Useful later, risky early because it can imply diagnostic certainty.
2. Detailed anatomical subparts for every region. Start coarse first.
3. Full 3D realism. Interaction clarity matters more than anatomical spectacle.

---

## Product Shape

Recommended New Check flow:

1. Home remains simple: Dashboard and New Entry.
2. New Entry opens a calm Atrium screen with the current question and body visualization.
3. User types or speaks the first answer.
4. If a body region is inferred, the body focuses that region.
5. The user can touch exact area(s), set pain/severity, and add descriptors.
6. The app converts body input into structured case facts.
7. Gemini receives both natural language and structured facts.
8. The next question chooses the next UI mode.
9. Multi-part symptoms remain visible as colored selected regions.

---

## Questions

### Answered

- **Q**: Should New Entry be a classic form?
  **A**: No. The stronger move is body-first adaptive intake.

- **Q**: Should the body be background decoration?
  **A**: No. It should be an input surface and a visible case state.

- **Q**: How do we handle multiple parts?
  **A**: Keep full body visible, color selected regions, let each selected region carry its own severity/details, and summarize all selections into the Gemini context.

### Blockers

- **Q**: Should v1 use the existing simple body model or a new richer 3D model?
- **Q**: What granularity should the first body map support: 8 current regions, or region + subregion?
- **Q**: Should users be able to skip body touch entirely and continue with text only?

## Next Steps

- [ ] Decide v1 body granularity.
- [ ] Define `BodyRegionDetail` shape for selected part, subpart, pain score, quality, and notes.
- [ ] Design the New Entry screen around question + body + answer controls.
- [ ] Update `/api/intake-ui` payload with structured body-selection context.
- [ ] Add safety copy that says the map records symptoms, not diagnosis.
