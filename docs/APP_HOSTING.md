# Firebase App Hosting (operator console)

This document describes how **Chronogrove** runs the Next.js operator console on **Firebase App Hosting**: backends, config files, runtime limits, and how that relates to **Cloud Functions** and deploys.

For product behavior and UI changes, see [apps/console/CHANGELOG.md](../apps/console/CHANGELOG.md). For request routing (`/api` rewrites), see [README.md § Hosting and backend notes](../README.md#hosting-and-backend-notes).

## What runs where

| Surface | Role |
|--------|------|
| **App Hosting** | Serves the Next.js app under `apps/console/` (SSR, routes, static assets). |
| **Cloud Functions (`app`)** | Serves **`/api/**`** for the console via **same-origin rewrites** from Next (`apps/console/next.config.ts`). Widget traffic from other sites can still call Functions URLs directly. |
| **Firestore / Auth** | Same Firebase project as Functions; the console uses the client SDK and session cookies as documented in [SESSION_COOKIES.md](SESSION_COOKIES.md). |

## Backends (`firebase.json`)

Two **App Hosting backends** share **`rootDir`: `./apps/console`** (see [`firebase.json`](../firebase.json) `apphosting`):

| Backend ID | Purpose |
|------------|---------|
| **`chronogrove-console`** | **Production** operator console ([metrics.chrisvogt.me](https://metrics.chrisvogt.me)). Has **`alwaysDeployFromSource`: true** so deploys always build from the checked-out tree. |
| **`chronogrove-console-pr`** | **Secondary** backend for **preview or staging**-style deploys (same codebase and `apphosting.yaml`; no `alwaysDeployFromSource` in repo config). Create and use this backend when you want a separate URL or lifecycle from production. Deploy with `firebase deploy --only apphosting:chronogrove-console-pr` when that backend is wired in your Firebase project. |

Backend IDs must exist in the Firebase project (Console or CLI, e.g. `firebase apphosting:backends:create`).

## `apps/console/apphosting.yaml`

- **`runConfig`** — CPU, memory, scaling, and **concurrency** (max concurrent requests per instance). Tuning affects latency under load and how work is multiplexed; see comments in the file and [Firebase App Hosting configuration](https://firebase.google.com/docs/app-hosting/configure).
- **`env`** — Non-secret **`NEXT_PUBLIC_*`** variables available at **BUILD** and **RUNTIME** (e.g. Cloud Functions origin for `/api` rewrites, tenant display host). Values are committed for this repo’s production URLs; fork/adjust for other projects.

Do not put private API keys in `apphosting.yaml`; use Firebase-managed secrets or your team’s secret store for sensitive values and wire them through the console or CLI as required by App Hosting.

## Deploy

**CI** runs lint, tests, and a workspace build; it does not deploy. **App Hosting** and **Functions** releases typically go through the **Firebase** GitHub app / project integration when that is connected; you can also deploy from the **repository root** with the CLI:

- **App Hosting only (production backend):** `pnpm run deploy:hosting`
- **Firestore + Functions + App Hosting:** `pnpm run deploy:all`

## Local emulation

Optional: App Hosting emulator with Functions + Auth + Firestore — see [README.md § Local development](../README.md#local-development) and [apps/console/README.md](../apps/console/README.md).

## See also

- [Firebase App Hosting — Configure and manage backends](https://firebase.google.com/docs/app-hosting/configure)
