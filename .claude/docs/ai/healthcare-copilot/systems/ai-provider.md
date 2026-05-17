# AI Provider

## Purpose

AI Provider is the shared provider-selection system for Atrium's server-side AI routes.

It supports two providers:

```text
Google Studio API
OpenRouter
```

Provider priority:

1. Google Studio when `GOOGLE_API_KEY` or `GEMINI_API_KEY` exists.
2. OpenRouter when `OPENROUTER_API_KEY` exists and no Google key exists.
3. Local deterministic fallback when no provider key exists.

If both Google and OpenRouter keys exist, Google Studio is used.

## Why This Exists

The app needs to work with Google Studio API keys while keeping OpenRouter support as a fallback provider. The previous OpenRouter-only setup made provider choice implicit. This system centralizes provider detection, request formatting, logging, and the manual provider test endpoint.

## User Flow

1. User starts or continues intake.
2. The frontend calls a local API route.
3. The route asks `src/lib/ai-provider.ts` which provider is active.
4. The route logs the chosen provider and model.
5. The route sends the prompt to Google Studio or OpenRouter.
6. The route normalizes the JSON response.
7. If no key exists or the provider fails, the route returns deterministic fallback behavior.

## Technical Flow

Shared provider helper:

```text
src/lib/ai-provider.ts
```

The helper owns:

- Provider priority.
- Google Studio model and API-key lookup.
- OpenRouter model, base URL, and headers.
- Logging selected provider/model without exposing secret keys.
- JSON request dispatch through `requestAiJson()`.

Google Studio uses the `generateContent` REST API:

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

with:

```text
x-goog-api-key: <GOOGLE_API_KEY or GEMINI_API_KEY>
```

OpenRouter uses the OpenAI-compatible chat completions endpoint:

```text
https://openrouter.ai/api/v1/chat/completions
```

CopilotKit uses:

- `GoogleGenerativeAIAdapter` when Google Studio is active.
- `OpenAIAdapter` pointed at OpenRouter when OpenRouter is active.
- `EmptyAdapter` when no key exists, so builds do not fail.

## Data And State

Environment variables:

```text
GOOGLE_API_KEY=
GEMINI_API_KEY=
GOOGLE_GEMINI_MODEL=gemini-3.1-flash-lite
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-3.1-flash-lite
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=Atrium Healthcare Copilot
```

The `.env` file is gitignored.

## Files

```text
.env
src/lib/ai-provider.ts
src/app/api/intake-ui/route.ts
src/app/api/patient-advice/route.ts
src/app/api/check-guide/route.ts
src/app/api/copilotkit/route.ts
src/app/api/provider-test/route.ts
```

## Safety And Privacy Notes

The AI provider is not authoritative for safety. Deterministic safety rules in `src/lib/safety.ts` remain the escalation source of truth.

Do not log API keys. Provider logs should include only provider name, model, route scope, and the non-secret reason for selection.

Do not put real patient secrets in prompts during development. The app currently sends case context to the configured provider for adaptive guidance, so future production work needs explicit privacy review before real clinical use.

## Acceptance Checks

```text
npm run lint
npm run build
```

Manual provider test:

1. Add a Google Studio or OpenRouter key to `.env`.
2. Start the app with `npm run dev`.
3. Open:

```text
http://localhost:3000/api/provider-test
```

Expected result with a working key:

```json
{
  "ok": true,
  "provider": {
    "name": "google",
    "model": "gemini-3.1-flash-lite"
  }
}
```

The provider can be `openrouter` if only `OPENROUTER_API_KEY` exists.

## Open Questions

- Should provider errors include response status in development logs?
- Should patient advice and intake UI use different model IDs later?
- Should production use a separate `OPENROUTER_SITE_URL` value?
