# Changelog

All notable changes to **chronogrove-hosting** (the Next.js admin UI on Firebase App Hosting) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **License** — Repository relicensed from MIT to **Apache License 2.0**; this package follows the workspace [LICENSE](../LICENSE). See root [CHANGELOG.md](../CHANGELOG.md).

## [0.6.16] - 2026-04-04

### Added

- **`auth/establishApiSession.ts`** — Shared helper for **`POST /api/auth/session`** plus **`localStorage`** Bearer fallback; covered by Vitest (jsdom).
- **`hosting/apphosting.yaml`** — Firebase App Hosting run config and public env for the console (see root `firebase.json`).

### Changed

- **Next.js** — SSR App Hosting build (removed static `output: 'export'` / `trailingSlash`); production **`/api/:path*`** rewrites proxy to **`NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN`**; dev uses **`beforeFiles`** rewrites to the Functions emulator (avoids App Router eating `/api` before proxy).
- **`getAppBaseUrl()`** — Same-origin **`/api`** only (no hardcoded metrics hostname); SSE unchanged (`getSyncStreamBaseUrl`).
- **Sign-up / Google** — Await **`establishApiSession`** before navigation; **`router.push('/onboarding/')`** instead of **`window.location`** so session `fetch` is not aborted mid-flight.
- **Onboarding** — Clear load error when retrying progress fetch; username field layout uses CSS grid and drops inner **`input:focus-visible`** outline in favor of the composite control ring.
- **Vitest** — Coverage includes **`establishApiSession`**; per-file thresholds **95%** (lines / statements / functions / branches). **`jsdom`** dev dependency for session tests.

### Fixed

- **Sign-up → onboarding** — “Could not load saved progress” on first paint when full navigation interrupted session cookie creation.

## [0.6.15] - 2026-04-03

### Added

- **Settings → Profile & API host** — Edit **username** and **custom API domain** after onboarding via **`SettingsProfileIdentity`** (**`components/user-settings/`**), same availability / DNS checks and **`PUT /api/onboarding/progress`** as the wizard. Layout uses **`profileRegion`** plus subsection spacing for parity with other settings blocks.

### Changed

- **`lib/onboardingConstraints.ts`** — Shared **`ONBOARDING_USERNAME_PATTERN`** for onboarding and settings.
- **Onboarding (username step)** — Copy now states the slug can be changed later in **Settings**.

**Deploy with Functions ≥ 0.29.0** for **`tenant_hosts`**, **`tenantHostname`**, and onboarding persistence behavior.

## [0.6.14] - 2026-04-04

### Fixed

- **Try API → Get widget data** — Each test now loads a **fresh Firebase ID token** via **`buildWidgetFetchHeaders`** instead of reusing async `idToken` state (which could still be empty on first click). Fixes production **cross-origin** console → **`metrics.chrisvogt.me`** requests that do not carry session cookies, so **GitHub** correctly reflects **OAuth** when linked instead of falling back to PAT and **`githubAuthMode: env`**.

## [0.6.13] - 2026-04-03

### Added

- **GitHub OAuth** — **Onboarding** and **Add providers** flyout: link/cancel flow (**`ProviderConnectionGrid`**), **`?oauth=github`** flash, same patterns as Flickr/Discogs.
- **Try API** — **Get widget data** sends **`Authorization: Bearer`** when an ID token is present; badge after a successful **github** request (**OAuth** vs **PAT / env**) via **`readGitHubAuthModeFromWidgetResponse`** and **`githubAuthMode`** on the widget JSON.

### Changed

- **Deploy with Functions ≥ 0.28.0** for GitHub OAuth routes, **`githubAuthMode`**, and authenticated widget reads.

## [0.6.12] - 2026-04-03

### Added

- **Discogs OAuth** — Same onboarding / flyout flow as Flickr (**`ProviderConnectionGrid`**, cancel pending, **`?oauth=discogs`** flash on **Onboarding** and **Overview**).
- **Sync page** — Badge after manual Discogs sync showing **OAuth (connected)** vs **legacy (env token)** via **`readDiscogsAuthModeFromSyncPayload`** and **`worker.discogsAuthMode`**.

### Changed

- **Deploy with Functions ≥ 0.27.0** for Discogs OAuth routes and sync **`discogsAuthMode`**.

## [0.6.11] - 2026-04-03

### Added

- **Onboarding** — **Flickr** link via OAuth (`ProviderConnectionGrid` / **`handleOAuthProviderConnect`**), optional cancel of a **pending** link, and flash copy for OAuth **success** or **error** query params.

### Fixed

- **Onboarding OAuth flash cleanup** — After reading **`oauth`**, **`status`**, **`reason`** (and **`providers`**), **`history.replaceState`** keeps unrelated query parameters, matching **Overview** behavior. **Deploy with Functions ≥ 0.26.0** for the Flickr API routes and **`PUT /api/onboarding/progress`** payload shape.

## [0.6.10] - 2026-03-31

### Changed

- **Dependencies** — Non-major bumps only: **Next.js** ^15.5.14, **firebase** ^12.11.0, **Vitest** / **@vitest/coverage-v8** ^4.1.2, **@types/node** ^22.19.15 (aligned with workspace **pnpm-lock.yaml**).

## [0.6.9] - 2026-04-01

### Fixed

- **Username availability on onboarding** — `check-username` requests now send **`Authorization: Bearer`** + Firebase ID token when signed in so the API can treat your **existing tenant claim** as available (same fix pattern as progress/sync). Prevents “taken by me” when the session cookie is not verified on that route. **Deploy with functions ≥ 0.25.7** so users who only have **`username` on `users/{uid}`** (no tenant claim yet) are also recognized as the owner.

## [0.6.8] - 2026-04-01

### Fixed

- **Onboarding progress API** — `GET`/`PUT` `/api/onboarding/progress` now sends **`Authorization: Bearer` + Firebase ID token** from `user.getIdToken()` (same pattern as manual sync SSE). The HttpOnly **`session` cookie** was present in the browser but **`verifySessionCookie` was failing** on the function; without `localStorage` fallback there was no Bearer, so the handler returned **`No valid authorization header found`**.

## [0.6.7] - 2026-04-01

### Security

- **Auth storage** — After a successful `createSession`, the Firebase ID token is no longer copied into `localStorage`. API auth relies on the **HttpOnly `session` cookie** plus **`apiSessionReady`** gating. `localStorage` is still used **only when session creation fails** (e.g. allowlist) so those clients can keep using Bearer fallback.

## [0.6.6] - 2026-04-01

### Fixed

- **Onboarding / API auth race** — `onAuthStateChanged` called `setUser` before `createSession` finished, so `GET /api/onboarding/progress` sometimes ran with no `session` cookie yet and no `Authorization` bearer (HttpOnly session is not readable from JS, and the success path did not set `localStorage`). That produced **`No valid authorization header found`**. The provider now exposes **`apiSessionReady`**, and onboarding waits for it before loading progress.

## [0.6.5] - 2026-03-31

### Fixed

- **CSRF on mutating API calls** — `ApiClient.putJson` now always fetches a fresh token from `GET /api/csrf-token` before `PUT`, so the `X-XSRF-TOKEN` header matches the current `_csrfSecret` cookie. Reusing a stale `XSRF-TOKEN` from `document.cookie` alone caused intermittent **“CSRF token mismatch”** in production (especially after strict cookie behavior or a desynced pair), including when saving onboarding progress.

## [0.6.4] - 2026-03-29

### Fixed

- **Build metadata SHA** — Local `pnpm run build`, `pnpm run dev`, `pnpm run dev:full:fresh`, and hosting deploys now pass the current short git SHA into the hosting build, and Turbo keys `chronogrove-hosting#build` on the SHA env vars used by `next.config.ts`. This prevents cached `hosting/out` bundles from reusing an older sidebar SHA across commits.

### Added

- **Tests** — `src/lib/buildSha.test.ts` covers the SHA env precedence, normalization, git fallback, and `unknown` fallback branches; coverage now includes `src/lib/buildSha.ts` alongside the existing per-file 100% checks.

## [0.6.3] - 2026-03-28

### Fixed

- **Firebase Hosting** — `firebase.json` sets `Cache-Control` so HTML and other documents revalidate (`public, max-age=0, must-revalidate`) while `/_next/static/**` remains long-lived (`immutable`), reducing post-deploy `ChunkLoadError` and odd client-side navigation when the CDN or browser kept an older shell.

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
