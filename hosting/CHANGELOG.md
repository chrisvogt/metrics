# Changelog

All notable changes to **metrics-hosting** (the Vite admin UI and static assets for Firebase Hosting) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
