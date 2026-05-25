# Access Gate

## Purpose

The access gate adds a simple login screen in front of Atrium so the public domain cannot be used freely during private preview.

It is intentionally small: one username, one password, and one HTTP-only session cookie.

## Why This Exists

Atrium is deployed to a public VPS domain before a full user account system exists. The gate prevents casual access while keeping the demo easy to operate and easy to remove or replace later.

## User Flow

Unauthenticated visitors are redirected to `/login`. After entering the configured username and password, the server sets an `atrium_session` cookie and redirects the user back to the page they originally requested.

Authenticated users can open the app and use the existing Body View, Dashboard, condition tree, and AI-backed API routes.

## Technical Flow

`middleware.ts` runs before pages and API routes. It allows login routes, Next.js static assets, and public file paths. All other page routes require the `atrium_session` cookie. Unauthenticated API requests receive a `401` JSON response.

`src/app/api/login/route.ts` validates the form credentials against `ATRIUM_LOGIN_USER` and `ATRIUM_LOGIN_PASSWORD`, then sets an HTTP-only cookie containing `ATRIUM_AUTH_TOKEN`.

`src/app/api/logout/route.ts` clears the cookie and returns to `/login`.

`src/app/login/page.tsx` renders the login form and redirects already-authenticated visitors back into the app.

## Data And State

Environment variables:

```text
ATRIUM_LOGIN_USER
ATRIUM_LOGIN_PASSWORD
ATRIUM_AUTH_TOKEN
```

Cookie:

```text
atrium_session
```

No user accounts, server-side sessions, or database records are created.

## Files

```text
middleware.ts
src/app/api/login/route.ts
src/app/api/logout/route.ts
src/app/login/page.tsx
src/app/globals.css
src/lib/auth.ts
.env.production.example
README.md
```

## Safety And Privacy Notes

The access gate is a lightweight preview barrier, not production-grade authentication. It should not be treated as compliance security, audit logging, account management, or fine-grained patient data protection.

The gate does reduce casual exposure of health-intake workflows and AI endpoints on the public domain. Atrium must still avoid storing sensitive patient data on the server unless a proper privacy and security plan is added.

## Acceptance Checks

```text
npm run lint
npm run build
```

Manual checks:

```text
GET / redirects to /login when no cookie is present.
POST /api/login with valid credentials sets atrium_session and redirects.
GET /api/provider-test returns 401 when no cookie is present.
```

## Open Questions

- When to replace the preview gate with a real user account system.
- Whether logout should be exposed in the app shell UI.
- Whether the production password should rotate after demos.
