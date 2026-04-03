<h1 align='center'>
  Chronogrove (<a href='https://metrics.chrisvogt.me' title='Operator console'>metrics.chrisvogt.me</a>)
</h1>

<p align='center'>
  <a href='https://github.com/chrisvogt/chronogrove/actions/workflows/ci.yml'>
    <img src='https://github.com/chrisvogt/chronogrove/actions/workflows/ci.yml/badge.svg?branch=main' alt='Continuous Integration badge' />
  </a>
  <a href='https://github.com/chrisvogt/chronogrove/actions/workflows/codeql.yml'>
    <img src='https://github.com/chrisvogt/chronogrove/actions/workflows/codeql.yml/badge.svg?branch=main' alt='CodeQL badge' />
  </a>
  <a href='https://codecov.io/gh/chrisvogt/chronogrove'>
    <img src='https://codecov.io/gh/chrisvogt/chronogrove/branch/main/graph/badge.svg?token=Hr0GpQiCu0' alt='Code coverage report badge.' />
  </a>
</p>

**Chronogrove** is the engine behind provider-backed widgets on [www.chrisvogt.me](https://www.chrisvogt.me): it syncs third-party accounts (Discogs, Steam, Instagram, Spotify, Goodreads, Flickr, and more), stores normalized widget documents, and serves them over a stable JSON API. Firebase is the reference runtime (Hosting + Cloud Functions + Firestore); the design stays portable enough to consider other hosts later.

Consumer experiences today include the open-source [**Gatsby theme Chronogrove**](https://github.com/chrisvogt/gatsby-theme-chronogrove). The goal is for the same API to power other site integrations (WordPress and similar) and, over time, shareable **Web Components** (and other HTML-native building blocks) that call the public routes directly.

This repository holds the **backend and operator console** (schema browser, status checks, authenticated sync). The themed marketing site and MDX content live in the Gatsby theme and site repos above.

> [!NOTE]
> **License:** This project is distributed under the [Apache License 2.0](LICENSE) (previously MIT). Details are in the root [CHANGELOG](CHANGELOG.md). You can remove or shorten this callout after the change is reflected in your next tagged release notes.

## Quick start (first 5 minutes)

1. **Install prerequisites**
   - Node.js (version in [.nvmrc](./.nvmrc), currently 24+)
   - pnpm (for example: `corepack enable && corepack prepare pnpm@10.32.1 --activate`)
   - Firebase CLI (`pnpm add -g firebase-tools` or `npm install -g firebase-tools`)
   - `firebase login`
2. **Clone and install**
   ```bash
   git clone git@github.com:chrisvogt/chronogrove.git
   cd chronogrove
   pnpm install
   ```
3. **Set local env vars**
   ```bash
   cp functions/.env.template functions/.env.local
   # edit functions/.env.local (at least CLIENT_API_KEY, CLIENT_AUTH_DOMAIN, CLIENT_PROJECT_ID)
   ```
4. **Run local dev (recommended)**
   ```bash
   pnpm run dev:full
   ```
5. **Open**
   - App: `http://localhost:5173`
   - Emulator UI: `http://127.0.0.1:4000`

If `/api` calls fail in local dev, the Functions emulator is usually not reachable.

## What this project does

- Fetches and serves widget data for: Spotify, Steam, Goodreads, Instagram, Discogs, Flickr, and GitHub.
- Supports scheduled sync jobs plus manual admin-triggered sync.
- Uses Firebase Auth (Google, email/password, phone) with HTTP-only session cookies and JWT fallback.
- Runs locally with Firebase emulators.
- Serves the Next.js operator dashboard at [metrics.chrisvogt.me](https://metrics.chrisvogt.me).

> Note: `github` is a readable widget provider, but **not** part of the scheduled/manual sync queue.

## Architecture at a glance

This service backs widgets on [www.chrisvogt.me](https://www.chrisvogt.me) and any client using the same API contract (for example the [Gatsby theme](https://github.com/chrisvogt/gatsby-theme-chronogrove)). Each diagram is intentionally focused on one path. For queue semantics and job document fields, see [docs/SYNC_JOB_QUEUE.md](docs/SYNC_JOB_QUEUE.md).

### 1) Public widget reads

Unauthenticated widget reads from Firestore-backed content.

```mermaid
flowchart LR
  site[www.chrisvogt.me or theme] --> fn[Cloud Functions<br/>GET /api/widgets/:provider]
  fn --> fs[(Firestore<br/>users/.../widget-content)]
```

### 2) Scheduled sync (planner + worker)

Planner enqueues one job per syncable provider. Worker claims queued jobs and runs provider sync.

```mermaid
flowchart TB
  subgraph sched[Cloud Scheduler]
    p[runSyncPlanner · default schedule]
    w[runSyncWorker · every 15 min]
  end
  p --> plan[planSyncJobs]
  plan --> q[(Firestore · sync_jobs)]
  w --> next[runNextSyncJob]
  next --> q
  next --> job[processSyncJob + provider sync]
  job --> apis[Platform APIs]
  job --> docs[(Firestore · widget documents)]
```

### 3) Operator console manual sync

[metrics.chrisvogt.me](https://metrics.chrisvogt.me) uses Firebase Auth + session cookie. Manual sync runs inline (enqueue -> claim -> process) instead of waiting for worker cadence.

```mermaid
flowchart TB
  admin[Operator console] --> auth[Firebase Auth]
  admin --> sess[POST /api/auth/session]
  admin --> sync[GET /api/widgets/sync/:provider]
  admin --> stream[GET .../sync/:provider/stream SSE]
  sync --> fn[runSyncForProvider]
  stream --> fn
  fn --> q[(sync_jobs)]
  fn --> job[processSyncJob]
  job --> out[Platform APIs + widget writes]
```

### Key request flows

| Flow | Description |
|------|-------------|
| **Widget reads** | `GET /api/widgets/:provider` (public, cached). Reads provider widget document from Firestore and returns it. |
| **Scheduled sync** | `runSyncPlanner` enqueues queue jobs; `runSyncWorker` periodically claims and executes queued jobs. |
| **Manual sync** | Authenticated `GET /api/widgets/sync/:provider` (JSON) or `GET /api/widgets/sync/:provider/stream` (SSE). Both use the same queue + inline processing path. |
| **Auth** | Dashboard signs in with Firebase Auth and creates a session cookie through `POST /api/auth/session`. Protected routes accept session cookie or JWT. |

## Monorepo layout

This repository is a pnpm workspace with:

- `hosting/`: Next.js dashboard (static export)
- `functions/`: Firebase Cloud Functions backend

Turborepo runs workspace scripts from the root and caches work.

**Use repo root for commands** (do not run per-package installs).

## Commands (repo root)

| Command | What it does |
|--------|----------------|
| `pnpm install` | Install dependencies for root and both packages. |
| `pnpm run dev` | Run Next.js dev server on `localhost:5173`. Expects Functions emulator to be running for `/api` calls. |
| `pnpm run dev:full` | Run Firebase emulators + Next dev together (uses `firebase emulators:start` and `pnpm run dev`). |
| `pnpm run build` | Run workspace builds via Turborepo (`hosting` export and `functions` TypeScript build). |
| `pnpm run lint` | Run workspace lint tasks (currently functions ESLint). |
| `pnpm run test` | Run workspace tests. |
| `pnpm run test:coverage` | Run tests with coverage. |
| `pnpm run deploy:all` | Guard env + build + deploy default Firebase targets. |
| `pnpm run deploy:hosting` | Build and deploy only Firebase Hosting. |
| `pnpm run deploy:functions` | Guard env + deploy only Functions (Firebase predeploy still builds functions). |

> Use `pnpm run deploy:all` (with `run`). `pnpm deploy` is a pnpm command, not this project's deploy flow.

## Local development

### Option A (recommended): hot reload dashboard + emulators

One terminal:

```bash
pnpm run dev:full
```

Or split terminals:

```bash
# Terminal 1
firebase emulators:start --only functions,auth

# Terminal 2
pnpm run dev
```

Open `http://localhost:5173`.

### Option B: full Firebase-like local serving

```bash
pnpm run build
firebase emulators:start --only hosting,functions,auth
```

Open the hosting URL (for example `http://metrics.dev-chrisvogt.me:8084`).

### Emulator URLs

| Service | URL |
|---------|-----|
| Emulator UI | `http://127.0.0.1:4000` |
| Hosting | `http://127.0.0.1:8084` (or configured host) |
| Functions | `http://127.0.0.1:5001` |
| Auth | `http://127.0.0.1:9099` |
| Firestore | `http://127.0.0.1:8080` |

## Environment variables

For local development:

```bash
cp functions/.env.template functions/.env.local
```

Set at minimum:

- `CLIENT_API_KEY`
- `CLIENT_AUTH_DOMAIN`
- `CLIENT_PROJECT_ID`

Optional examples:

- `NODE_ENV=development`
- `GEMINI_API_KEY` (if AI summary features are enabled)

### Important env safety notes

- Never commit `functions/.env.local`.
- Avoid `functions/.env` during normal development; Firebase can deploy values from that file into Functions.

## API surface (high-level)

### Public widget reads

- `GET /api/widgets/:provider` where `provider` is one of:
  - `discogs`, `flickr`, `github`, `goodreads`, `instagram`, `spotify`, `steam`

### Protected sync endpoints

- `GET /api/widgets/sync/:provider` (JSON)
- `GET /api/widgets/sync/:provider/stream` (SSE)

Syncable `provider` values are:

- `discogs`, `flickr`, `goodreads`, `instagram`, `spotify`, `steam`

### Auth/config endpoints

- `POST /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/client-auth-config`
- `GET /api/firebase-config` (compat alias)

## Hosting and backend notes

### Hosting rewrites (`firebase.json`)

1. `/api/**` rewrites to Cloud Function `app`.
2. No SPA catch-all rewrite. Static exported routes are served directly; unmatched routes return exported `404.html`.

### Backend details (`functions/`)

- Provider-neutral bootstrap wires runtime/config/store/auth adapters.
- Current implementation uses Firebase runtime/auth/document adapters.
- Functions source is TypeScript; build output is `functions/lib/`.

## Testing

From repo root:

```bash
pnpm run test
pnpm run test:coverage
```

Functions watch mode:

```bash
pnpm --filter chronogrove-functions run test:watch
```

## Deployment

From repo root:

```bash
pnpm run build
pnpm run deploy:all
pnpm run deploy:hosting
pnpm run deploy:functions
```

## Additional docs

Reference docs under [`docs/`](docs/):

| Document | What it covers |
|----------|----------------|
| [docs/SYNC_JOB_QUEUE.md](docs/SYNC_JOB_QUEUE.md) | `sync_jobs` queue behavior (planner, worker, manual sync, states, summary metrics). |
| [docs/SESSION_COOKIES.md](docs/SESSION_COOKIES.md) | Session cookie model, `/api/auth/session`, JWT fallback, security properties. |
| [docs/MULTI_TENANT_ARCHITECTURE_PLAN.md](docs/MULTI_TENANT_ARCHITECTURE_PLAN.md) | Migration plan from single-tenant env config toward user-scoped storage and sync. |

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Install and configure local env.
4. Run tests (`pnpm run test`).
5. Ensure builds pass (`pnpm run build`).
6. Open a pull request.

## Copyright & License

Copyright © 2020-2026 [Chris Vogt](https://www.chrisvogt.me). Licensed under the [Apache License 2.0](LICENSE).
