# Intake Guardrails

## Purpose

Intake Guardrails keep the Body View question loop focused, finite, and safe. They prevent greetings, unrelated user requests, and boundary-breaking medical requests from being recorded as symptom context, and they prevent Atlas from asking the same question repeatedly.

## Why This Exists

The visible product should feel conversational, but the app cannot let the model own the whole conversation. A healthcare intake needs deterministic controls for:

- off-topic user turns
- greeting-only or assistant-address-only turns
- diagnosis or prescription requests
- repeated questions
- infinite loops
- useful question limits
- final review handoff

The implementation uses app-owned state and route validation first, then lets the AI provider phrase the next Atlas question inside that bounded slot.

## User Flow

1. User answers by text, voice, body click, or guided choice.
2. `NewEntryFlow` classifies the answer before calling `applyAdaptiveAnswer()`.
3. In-scope answers update the case graph and route through `/api/intake-ui`.
4. Greeting-only answers such as `Hi gemini` show a friendly opening reprompt and do not advance the intake.
5. Off-topic answers show a scope redirect Atlas card and do not become symptom narrative.
6. Diagnosis or prescription requests show a safety-boundary redirect and do not become diagnostic content.
7. Repeated off-topic/boundary turns eventually force a choice: continue the check, use the body map, final review, or dashboard.
8. `/api/intake-ui` independently repeats the same scope and loop controls before provider output is accepted.
9. The app selects the next useful information slot; the AI only phrases that slot.
10. The question ledger blocks repeated or semantically similar questions.
11. The flow asks at least two intake questions before normal final review.
12. The flow moves to final review at the hard cap or when enough structured context exists after the minimum.

## Technical Flow

Shared guardrail logic lives in:

```text
src/lib/intake-guardrails.ts
```

The main controls are:

```ts
classifyIntakeScope(...)
isGreetingOnlyInput(...)
greetingRepromptSpec(...)
recordScopeEvent(...)
shouldStopForScope(...)
chooseNextQuestionSlot(...)
addQuestionToLedger(...)
markCurrentQuestionAnswered(...)
questionRepeatsLedger(...)
questionSpecForSlot(...)
scopeRedirectSpec(...)
```

`NewEntryFlow` calls the classifier before applying an answer. The first open-answer Continue button is disabled until the user types, speaks, or selects the body, which prevents a blank start from becoming an off-topic redirect:

```text
answer
-> classifyIntakeScope()
-> if greeting: opening reprompt with no case mutation
-> if off_topic / medical_boundary: scope redirect card
-> else applyAdaptiveAnswer()
-> /api/intake-ui
```

`/api/intake-ui` repeats the classification and slot selection:

```text
payload
-> caseGraphFromPayload()
-> classifyIntakeScope()
-> greeting reprompt when only a greeting or assistant name is present
-> chooseNextQuestionSlot()
-> provider prompt locked to that slot
-> normalize provider output
-> reject repeated question
-> fallback slot question when needed
```

The route receives `allowedChoices` from the visible Atlas card so selected multiple-choice answers remain in-scope even when the choice text is short or not a symptom keyword. First-turn health-intake language also accepts common natural phrases such as "I feel sick", "I feel bad", "not sure", "issue", or "concern" so the app does not immediately fall into the generic `What health detail should we focus on?` scope redirect after the opening question. The first open-answer prompt is intentionally lenient: short rough body-part answers and common typos such as `stomatch` are kept in the intake flow unless they clearly match a greeting-only, off-topic, or medical-boundary pattern.

Greeting-only text is handled like a welcome/no-match intent, not like symptom content. Examples include `Hi`, `Hello Gemini`, `Hola Atlas`, or `Gemini`. These responses return `greetingRepromptSpec()`, keep `questionCount` unchanged, keep the original `chief_concern` slot pending, and ask `What brings you in today?` again with focused choices.

Atlas answer cards have a stable six-button contract:

```text
4 provider or deterministic choices
Something else...
smart none/not-applicable choice
```

The provider and fallback specs must not include `Other`, `None`, or `No` in the four generated choices because `NewEntryFlow` owns those utility choices. The smart none label depends on `currentQuestionSlot`, and its submitted meaning can add relevant negative context such as `Denied listed warning signs` or `No medicine or allergy context reported`. This does not prove absence of risk; it only records that the user denied the visible option set.

## Data And State

`CaseGraph` now includes:

```ts
currentQuestionSlot?: IntakeQuestionSlot;
questionLedger?: QuestionLedgerEntry[];
scopeState?: IntakeScopeState;
```

Question slots:

```text
chief_concern
body_location
body_precision
quality
severity
timeline
red_flags
medical_history
medications_allergies
review
scope_redirect
```

Scope categories:

```text
in_scope
greeting
off_topic
medical_boundary
emergency
```

Question caps:

```text
MIN_QUESTION_LIMIT = 2
SOFT_QUESTION_LIMIT = 6
HARD_QUESTION_LIMIT = 10
OFF_TOPIC_STOP_LIMIT = 3
```

The ledger stores the normalized question text, slot, turn number, answered state, and a short answer summary. `applyAdaptiveAnswer()` marks the active slot as answered before updating symptoms and missing info.

Normal final review cannot trigger until at least two intake answers are recorded. Deterministic emergency safety can still stop the flow immediately with emergency guidance, because safety boundaries outrank the minimum question count.

## Files

```text
src/lib/types.ts
src/lib/intake-guardrails.ts
src/lib/agent-flow.ts
src/app/api/intake-ui/route.ts
src/components/new-entry/NewEntryFlow.tsx
src/components/new-entry/types.ts
.claude/docs/ai/healthcare-copilot/systems/intake-guardrails.md
```

## Safety And Privacy Notes

Off-topic text is not added to `userNarrative`, symptoms, timeline, or body findings.

Greeting-only text is also not added to `userNarrative`, symptoms, timeline, or body findings. It does not increment the off-topic counter, because a greeting is a normal conversation opener rather than misuse.

Medical-boundary text such as direct diagnosis or prescription requests is redirected. The app can still continue intake, but it must not answer the request as a diagnosis or medication instruction.

Emergency language is treated as in-scope so deterministic safety rules can still trigger. The model cannot override deterministic safety state.

Question history is local case-state metadata for loop control. It should not include more answer text than needed; answer summaries are truncated.

Smart none/not-applicable answers are treated as user-reported context, not clinical findings. For red flags, `None of these` means none of the listed warning signs were selected, not that the user is medically safe.

## Acceptance Checks

- Clearly off-topic first answers show a redirect card instead of creating symptom narrative.
- Greeting-only first answers such as `Hi gemini` show the opening reprompt and do not advance to severity or another medical slot.
- Mixed greeting plus symptom text such as `Hi, my chest hurts` stays in scope.
- Ambiguous but health-shaped first answers continue to the next intake slot instead of the generic health-detail redirect.
- Short body-part first answers, including common typos such as `stomatch`, stay in the intake flow.
- Repeated off-topic turns reach the stop redirect.
- Diagnosis/prescription requests show a safety-boundary redirect.
- In-scope body/timeline/severity answers continue the check.
- Guided follow-up cards show four normal choices plus `Something else...` plus a slot-aware none/not-applicable option.
- Choosing the smart none option completes the current slot without forcing the same question to repeat.
- A question slot answered once is not selected again.
- Provider questions that repeat the ledger are replaced by deterministic fallback questions.
- Normal final review does not trigger before two intake answers.
- The route uses a hard cap of 10 questions.
- Final review still works when the route reaches review or a guided review action is selected.
- `npm run lint` passes.
- `npm run build` passes.

## Open Questions

- Should final review become automatic at the soft limit when body location, severity, and timeline are known?
- Should scope redirect cards show a separate dashboard button instead of using a normal choice?
- Should future versions use a small model/classifier endpoint for scope detection instead of deterministic regex plus context rules?
