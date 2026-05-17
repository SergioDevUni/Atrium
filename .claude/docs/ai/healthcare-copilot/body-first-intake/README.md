# Body-First Intake Planner

This folder is the working planner for the Atrium-style `New Check` / Body View flow in the healthcare app.

Goal: replace the classic form/chat intake feeling with a body-first adaptive intake where the user can answer by text, voice, body touch, severity slider, and symptom descriptors.

## How Another IA Should Use This Folder

Start here, then read in order:

1. [01-product-vision.md](./01-product-vision.md) - what we are building and why it matters.
2. [02-implementation-plan.md](./02-implementation-plan.md) - detailed implementation plan, milestone checklist, and acceptance checks.
3. [03-ux-flow.md](./03-ux-flow.md) - Body View behavior and interaction states.
4. [04-data-model.md](./04-data-model.md) - proposed case graph additions and OpenRouter/Gemini context format.
5. [05-decision-log.md](./05-decision-log.md) - decisions made, open decisions, and defaults.

Use the previous 10x analysis as context:

- [../10x/session-2.md](../10x/session-2.md)

System-level docs live here:

- [../systems/README.md](../systems/README.md)

Every system addition or meaningful system change needs a matching `.md` in that folder, either updated or created in the same task.

## Source Of Truth

The healthcare app lives in:

```text
C:\Users\serch\OneDrive\Escritorio\Hackatons\AiThinkers
```

Important current files:

```text
src/app/page.tsx
src/lib/types.ts
src/lib/agent-flow.ts
src/lib/safety.ts
src/app/api/intake-ui/route.ts
src/app/api/patient-advice/route.ts
```

## Product Boundary

Atrium records and visualizes symptoms for educational guidance, intake, and visit preparation. It must not diagnose, prescribe, or replace medical care.

## Naming

Use "Body-First Intake" for the feature and "Atrium" for the visualization layer.

Recommended component names:

```text
NewEntryFlow
AtriumIntakeSurface
BodyInteractionModel
BodyFindingEditor
AtlasBodyAreaStrip
```

Recommended data name:

```text
bodyFindings
```
