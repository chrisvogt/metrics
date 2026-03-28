# Changelog

All notable changes to **metrics-hosting** (the Next.js admin UI and static export for Firebase Hosting) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Framework** – Replaced Vite with **Next.js 15** (App Router, `output: 'export'` → `hosting/out`). Routes: `/schema/`, `/status/`, `/auth/`, `/endpoints/` (API testing; avoids clashing with Firebase `/api/**` → function), `/sync/`; `/` redirects to `/schema/`. Build metadata: `NEXT_PUBLIC_GIT_SHA` via `next.config.ts` (replaces Vite `define` / `VITE_GIT_SHA`).
- **Dev proxy** – `next.config.ts` rewrites forward `/api` to the Functions emulator in development only (static export does not ship those rewrites; production uses `firebase.json`).

### Removed

- **Vite** – `vite.config.ts`, SPA entry (`main.tsx` / `App.tsx`), and unused `react-router-dom` wrapper.
- **Hosting SPA catch-all** – Dropped `firebase.json` rewrite `**` → `/index.html` so unknown paths use Firebase’s **`404.html`** from `hosting/out` instead of always loading the home shell.

## [0.5.0] - 2026-03-27

### Added

- **Schema** – Row and sample payload for manual sync **SSE** `GET /api/widgets/sync/{provider}/stream` (`text/event-stream`: `progress` / `done` / `error`).
- **JsonCodeBlock** – Lowlight-based JSON examples on the schema page (reuses shared example objects).
- **Sync** – Consumes the SSE stream during manual sync for live status (same session as the JSON route).

### Changed

- **Schema** – Sync section intro contrasts queue-backed JSON `GET …/sync/{provider}` vs streaming `…/stream`.

## [0.4.0] - 2026-03-26

### Added

- **Schema** – API reference page: public widget `GET` routes always visible; sync, auth/session, and account routes only when signed in.
- **Status** – Table of lightweight `GET` checks (widgets + optional `/api/client-auth-config` when signed in), latency, and `meta.synced` when present.
- **`getAppBaseUrl()`** – Shared base URL helper for dev vs production API calls.
- **Build metadata** – Short Git commit SHA under the sidebar title via Vite `define` (env fallbacks: `VITE_GIT_SHA`, `GITHUB_SHA`, etc., then `git rev-parse`).

### Changed

- **Layout** – METRICS API branding; minimal top bar (sign-in / avatar + sign-out); removed duplicate header title and sidebar “Main” group; **Schema** and **Status** in nav for everyone; **API** and **Sync** when signed in.
- **Sign-in** – Moved from sidebar to header; sign-in view keeps FloatingLines + existing auth forms.
- **Status** – `meta.synced` at Unix epoch (`Date(0)`) displays as **—**, consistent with missing sync timestamps.

## [0.3.0] - 2026-03-06

### Added

- **Local workflow** – This package is the Vite app started by root `pnpm run dev:full` alongside Auth and Functions emulators.

### Fixed

- **API testing** – Bypass browser cache for widget, session, and sync test requests so developer tests see fresh responses.
- **Vite proxy** – When the backend is not running, `/api` requests return 503 with JSON instead of raw connection errors.
