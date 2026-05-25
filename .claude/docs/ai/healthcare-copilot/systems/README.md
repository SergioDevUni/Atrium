# System Documentation

This folder stores one Markdown file per durable system in the healthcare copilot project.

Use this folder whenever a change adds, removes, or meaningfully changes a system. A system can be a feature flow, component family, data model, API route, safety rule set, visualization layer, integration, or workflow that future contributors need to understand.

## Rule

Every system addition or system change must have a matching `.md` file that explains how it works, the flow it supports, and why it was added or changed.

Before changing a system:

1. Search this docs area for an existing `.md`.
2. Update the existing doc if it matches.
3. Create a new doc if no matching doc exists.
4. Keep the doc close to the code change in the same task.

## Naming

Use kebab-case names:

```text
body-findings.md
new-entry-flow.md
atrium-intake-surface.md
ai-provider.md
safety-rules.md
```

## Required Sections

Each system doc should include:

- Purpose
- Why This Exists
- User Flow
- Technical Flow
- Data And State
- Files
- Safety And Privacy Notes
- Acceptance Checks
- Open Questions

Use [_template.md](./_template.md) as the default structure.

## Current System Docs

- [body-first-intake.md](./body-first-intake.md) - Atrium Body View intake with draft body findings, adaptive questions, CopilotKit context, and safety-aware visualization.
- [ai-provider.md](./ai-provider.md) - Google Studio/OpenRouter provider selection for intake, patient advice, check guide, and CopilotKit.
- [app-shell.md](./app-shell.md) - URL-backed app workspace shell for Entry View, Body View, Dashboard, language, and local check history.
- [check-storage.md](./check-storage.md) - IndexedDB persistence for active drafts, saved check records, reviewed assessment snapshots, and legacy localStorage migration.
- [condition-tree.md](./condition-tree.md) - Browsable clinical knowledge map for possible condition paths, missing clues, red flags, and future review highlighting.
- [new-entry-flow.md](./new-entry-flow.md) - Active `New Check` Body View with floating questions, body finding editing, and final review transition.
- [atrium-intake-surface.md](./atrium-intake-surface.md) - Entry View and Body View UX shell that merges Atrium UI with AiThinkers healthcare logic.
- [intake-guardrails.md](./intake-guardrails.md) - Scope redirects, question ledger, anti-repeat controls, and finite Atlas question loop.
- [vps-deployment.md](./vps-deployment.md) - DigitalOcean Docker Compose deployment with a PM2-managed Next.js app and Caddy HTTPS proxy for a Namecheap domain.
- [access-gate.md](./access-gate.md) - Lightweight hardcoded login gate that protects Atrium pages and API routes during private preview.

## Task Lists

- [TaskList/atrium-body-view-copilotkit-merge-plan.md](./TaskList/atrium-body-view-copilotkit-merge-plan.md) - Detailed implementation plan for merging Atrium's Body View UX with AiThinkers' CopilotKit, case graph, body findings, and safety engine.
