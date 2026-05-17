# Product Vision

## Core Idea

New Entry should not feel like filling out a form.

It should feel like showing the app what is happening in your body.

The user can type a natural answer, and the Atrium body reacts. If the user writes "I feel bad of head," the body focuses the head. Then the user can touch the exact area, set pain level, and add symptom quality. Those interactions become structured facts in the case graph and in the Gemini prompt context.

## Product Shape

Home remains simple:

```text
Dashboard | New Entry
```

New Entry becomes:

```text
Question + text answer + interactive body + selected findings
```

Later, the wider workspace can become:

```text
Intake | Atrium | Summary | Records
```

## Why This Is 10x

Most healthcare intake products ask the user to describe symptoms in text or complete a rigid form. Body-first intake lets the user answer with language and touch.

This matters because many users know where something feels wrong before they can describe it clinically. The body model becomes a practical input surface, not decoration.

## Experience Principles

- The body is an input surface.
- Text-only must still work.
- Body touch is encouraged, not mandatory.
- The UI records symptoms, not diagnoses.
- Red flags should be visible and calm.
- Multiple affected areas must be easy to add and edit.
- The case graph remains the source of truth.
- Gemini receives structured facts, not vague text only.

## Example Flow

1. User clicks New Entry.
2. App asks: "What brings you in today?"
3. User types: "I feel bad of head."
4. App infers `head` and focuses/highlights the head.
5. UI says: "Touch where it feels wrong."
6. User taps left temple.
7. User sets pain to 7/10 and chooses "pressure."
8. UI shows summary: "Head > left temple, pressure, 7/10."
9. Gemini receives both the natural answer and structured body finding.
10. The next question becomes more focused.

## Non-Goals For V1

- No diagnosis.
- No organ-level internal anatomy.
- No detailed full medical atlas.
- No forced body selection.
- No separate Atrium state model.
- No separate Atrium app.

## Success Criteria

The first milestone succeeds when:

- New Entry visually feels distinct from a classic form.
- User can answer with text and body touch.
- At least one body finding is saved to the case graph.
- Multiple selected areas can be represented.
- Gemini prompt context includes body findings.
- Red-flag checks continue to run.
