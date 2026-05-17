# UX Flow

## Home

Home should remain simple.

Primary actions:

```text
New Check
Dashboard
```

Decision: keep visible copy as `New Check` and use `NewEntryFlow` only as the internal component name.

## Body View Layout

`New Check` opens Body View. Body View should contain:

- Atrium brand/top bar.
- Current question.
- Short supporting prompt.
- Text answer area.
- Mic control when browser speech recognition is available.
- Interactive body surface.
- Selected findings panel.
- Compact body finding editor.
- Floating safety state when needed.
- Continue action.
- Cancel/back action.

The body should be visually dominant during intake but not block text input. Final review should take over almost all available space and make the body secondary.

## First Question State

Question:

```text
What brings you in today?
```

User can:

- type a natural answer
- speak a natural answer
- tap a body part first
- do both
- continue text-only

## Inferred Region State

Example:

```text
User: I feel bad of head
```

UI response:

- highlight head
- focus body on head
- show prompt: "Touch where it feels wrong."
- keep text answer visible
- show "Not sure" as an option

## Body Tap State

When user taps a region:

- create/select a draft body finding immediately
- show region name
- show severity slider
- show quality chips
- show notes field only if user expands or picks "other"
- show summary sentence

Quality chips for v1:

```text
sharp
pressure
burning
cramping
numbness
unknown
```

## Severity Slider

Range:

```text
0-10
```

Labels:

```text
0 none
1-3 mild
4-6 moderate
7-10 severe
```

Color:

```text
0-3 teal/green
4-6 amber
7-10 red
unknown neutral
```

## Multiple Parts State

When at least one finding exists:

- selected regions stay colored
- selected findings panel lists each finding
- user can edit a finding
- user can remove a finding
- user can add another area

Example list:

```text
Head > left temple, pressure, 7/10
Abdomen > lower right, cramping, 5/10
```

## Continue Behavior

When user clicks Continue:

1. Apply natural text answer through existing adaptive flow.
2. Create or update inferred/user-selected body findings.
3. Serialize body findings to prompt context.
4. Send natural answer + case graph + body context to `/api/intake-ui`.
5. Render next question and next UI mode.

## Next Question Modes

The next screen can adapt:

- `body_locator`: body focus and touch prompt.
- `severity_scale`: body finding editor emphasized.
- `timeline`: timeline rail emphasized.
- `red_flags`: safety strip and urgent symptom checklist emphasized.
- `medication_history`: history/medication/allergy panel emphasized.

Follow-up questions should appear as floating multiple-choice cards:

```text
4 quick choices
Something else... -> inline open answer
None / No
```

## Accessibility

Body touch cannot be the only way to answer.

Requirements:

- clickable regions need keyboard alternatives
- region list should mirror body model
- sliders need labels
- color cannot be the only severity indicator
- text-only flow must remain complete

## Copy Rules

Use symptom-recording language:

- "Touch where it feels wrong."
- "How strong is it there?"
- "Add another area."
- "This records what you feel; it is not a diagnosis."

Avoid:

- "Detected disease"
- "Diagnosis"
- "Your condition is"
- "Confirmed"
