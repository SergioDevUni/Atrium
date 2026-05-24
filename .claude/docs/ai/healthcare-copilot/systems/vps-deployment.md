# VPS Deployment

## Purpose

The VPS deployment system packages Atrium as a production Docker Compose stack for a DigitalOcean droplet. It runs the Next.js standalone server with PM2 and exposes it through Caddy, which handles HTTPS for the configured Namecheap domain.

## Why This Exists

Atrium needs a repeatable production path that can be recreated from Git instead of manually copying files to a server. Docker Compose keeps the app runtime, process manager, reverse proxy, and certificate storage explicit and portable.

## User Flow

The operator creates a DigitalOcean droplet, points the Namecheap DNS record to the droplet IP, copies `.env.production.example` to `.env.production`, fills in the domain and AI provider keys, then starts the stack with `docker compose up -d --build`.

Users visit the configured domain over HTTPS. Caddy receives public traffic and forwards it to the private `app` service on port `3000`.

## Technical Flow

`Dockerfile` builds the app in three stages:

1. Install dependencies with `npm ci`.
2. Build Next.js with standalone output.
3. Copy the standalone server, static assets, public assets, and PM2 ecosystem file into a slim runtime image.

`ecosystem.config.cjs` starts the generated `server.js` file with `pm2-runtime`. `docker-compose.yml` defines the `app` service and the `caddy` service on a shared private network. `Caddyfile` reads `DOMAIN` from `.env.production`, serves that hostname, applies basic response headers, and reverse-proxies to `app:3000`.

`next.config.ts` enables `output: "standalone"` so the runtime image does not need the full source tree or development dependencies.

## Data And State

The app remains stateless on the server. Current check history is stored in the browser through the existing check storage system. Production secrets live in `.env.production`, which must not be committed.

Caddy persists certificate and ACME account data in Docker volumes:

```text
caddy_data
caddy_config
```

## Files

```text
.dockerignore
.env.production.example
Caddyfile
Dockerfile
docker-compose.yml
ecosystem.config.cjs
next.config.ts
README.md
```

## Safety And Privacy Notes

The deployment does not add server-side patient data storage. AI provider keys are server-side environment variables and should only be stored in `.env.production` on the VPS or in a secure deployment secret store.

HTTPS is required for production use because intake text can contain sensitive health context. Atrium must continue to present itself as educational intake and visit-preparation software, not diagnosis, prescribing, or emergency triage.

## Acceptance Checks

```text
npm run lint
npm run build
docker compose config
```

On the VPS, also verify:

```text
docker compose ps
docker compose logs -f app
docker compose logs -f caddy
```

## Open Questions

- Which exact Namecheap domain or subdomain will be used for production.
- Whether production should later add a database, managed secrets, or automated GitHub Actions deployment.
- Whether PM2 should stay single-process or use cluster mode after observing droplet CPU and memory usage.
