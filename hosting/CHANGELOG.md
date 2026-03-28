# Changelog

All notable changes to **metrics-hosting** (the Next.js admin UI and static export for Firebase Hosting) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.2] - 2026-03-28

### Fixed

- **Overview (`/`)** — Provider cards read **`extractOverviewMetrics`** from `src/lib/overviewMetrics.ts`. **Discogs** stores `metrics` as a `Record` (e.g. “LPs Owned”), not a `WidgetMetricValue[]`, so the overview showed “Live — no stored metrics” despite a 200. **Goodreads** never emits `metrics`; counts now come from **`profile.readCount`** and **`collections.recentlyReadBooks.length`** when needed.

### Added

- **Tests** — `src/lib/overviewMetrics.test.ts`; Vitest coverage includes `overviewMetrics.ts` with `perFile` thresholds alongside `baseUrl.ts`.

## [0.6.1] - 2026-03-28

### Fixed

- **Manual sync SSE** — The sync test `fetch` now targets the Cloud Functions HTTPS origin (`NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN`, default in `next.config.ts`) via `getManualSyncStreamUrl()`, so Firebase Hosting rewrites no longer buffer the entire `text/event-stream` response. Granular progress lines appear during the job.

### Added

- **Tests** — Vitest for the hosting package; `src/lib/baseUrl.test.ts` with 100% coverage of `src/lib/baseUrl.ts` (thresholds enforced in `vitest.config.ts`).

## [0.6.0] - 2026-03-28

### Added

- **Chronogrove** — Product naming and **Starry Night**–inspired palette (indigo sky, cerulean accents, gold highlights) across the main console shell, overview, and shared CSS tokens.
- **Overview (`/`)** — Deployment dashboard: provider health cards from widget endpoints, quick links to schema/status/sync, and **GroveScene** (Three.js fractal tree + provider “stem” state).
- **Tenant headline** — `NEXT_PUBLIC_TENANT_DISPLAY_HOST` (default in `next.config.ts`; override per deployment). Overview hero and metadata use the public site hostname instead of a fixed title.
- **Sign-in background** — Full-screen **StarryNightScene** (Three.js): layered brush-stroke bundles, starbursts, cypress, rolling hills, village silhouettes, moon, particles; elastic pop-in and mouse parallax. Replaces the earlier 2D canvas / line-only experiments.
- **Marketing shell** — Optional `footerCopy` prop; default footer text describes Chronogrove without implying link position. `hosting/.env.example` documents tenant display host.
- **Public pages** — `/docs/`, `/privacy/`, `/about/` with matter-of-fact copy (not marketing pitch).

### Changed

- **Framework** — **Vite → Next.js 15** (App Router, `output: 'export'` → `hosting/out`). Routes include `/`, `/schema/`, `/status/`, `/auth/`, `/endpoints/`, `/sync/`, plus static marketing routes. Build metadata: `NEXT_PUBLIC_GIT_SHA` via `next.config.ts`.
- **Dev proxy** — `next.config.ts` rewrites forward `/api` to the Functions emulator in development only (static export does not ship those rewrites; production uses `firebase.json`).
- **Layout** — Chronogrove sidebar branding; overview section kicker includes tenant host when on home.
- **Status** — Table column label **Status** (response code), not “HTTP”, to avoid implying cleartext-only APIs.
- **Copy** — Privacy/docs wording for HTTPS vs public endpoints; overview uses **stems** for live providers.

### Removed

- **Vite** — `vite.config.ts`, SPA entry (`main.tsx` / `App.tsx`), and unused `react-router-dom` wrapper.
- **Hosting SPA catch-all** — Dropped `firebase.json` rewrite `**` → `/index.html` so unknown paths use Firebase’s **`404.html`** from `hosting/out` instead of always loading the home shell.

## [0.5.0] - 2026-03-27

### Added

- **Schema** — Row and sample payload for manual sync **SSE** `GET /api/widgets/sync/{provider}/stream` (`text/event-stream`: `progress` / `done` / `error`).
- **JsonCodeBlock** — Lowlight-based JSON examples on the schema page (reuses shared example objects).
- **Sync** — Consumes the SSE stream during manual sync for live status (same session as the JSON route).

### Changed

- **Schema** — Sync section intro contrasts queue-backed JSON `GET …/sync/{provider}` vs streaming `…/stream`.

## [0.4.0] - 2026-03-26

### Added

- **Schema** — API reference page: public widget `GET` routes always visible; sync, auth/session, and account routes only when signed in.
- **Status** — Table of lightweight `GET` checks (widgets + optional `/api/client-auth-config` when signed in), latency, and `meta.synced` when present.
- **`getAppBaseUrl()`** — Shared base URL helper for dev vs production API calls.
- **Build metadata** — Short Git commit SHA under the sidebar title via Vite `define` (env fallbacks: `VITE_GIT_SHA`, `GITHUB_SHA`, etc., then `git rev-parse`).

### Changed

- **Layout** — METRICS API branding; minimal top bar (sign-in / avatar + sign-out); removed duplicate header title and sidebar “Main” group; **Schema** and **Status** in nav for everyone; **API** and **Sync** when signed in.
- **Sign-in** — Moved from sidebar to header; sign-in view keeps FloatingLines + existing auth forms.
- **Status** — `meta.synced` at Unix epoch (`Date(0)`) displays as **—**, consistent with missing sync timestamps.

## [0.3.0] - 2026-03-06

### Added

- **Local workflow** — This package is the Vite app started by root `pnpm run dev:full` alongside Auth and Functions emulators.

### Fixed

- **API testing** — Bypass browser cache for widget, session, and sync test requests so developer tests see fresh responses.
- **Vite proxy** — When the backend is not running, `/api` requests return 503 with JSON instead of raw connection errors.
