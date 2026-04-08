# Firebase App Hosting (operator console)

This document describes how **Chronogrove** runs the Next.js operator console on **Firebase App Hosting**: backends, config files, runtime limits, and how that relates to **Cloud Functions** and deploys.

For product behavior and UI changes, see [apps/console/CHANGELOG.md](../apps/console/CHANGELOG.md). For request routing (`/api` rewrites), see [README.md § Hosting and backend notes](../README.md#hosting-and-backend-notes).

## What runs where

| Surface | Role |
|--------|------|
| **App Hosting** | Serves the Next.js app under `apps/console/` (SSR, routes, static assets). |
| **Cloud Functions (`app`)** | Serves **`/api/**`** for the console via **same-origin rewrites** from Next (`apps/console/next.config.mjs`). Widget traffic from other sites can still call Functions URLs directly. |
| **Firestore / Auth** | Same Firebase project as Functions; the console uses the client SDK and session cookies as documented in [SESSION_COOKIES.md](SESSION_COOKIES.md). |

### Email verification action URL

In **Firebase Console → Authentication → Templates → Email address verification**, set the **custom action URL** to the console’s verify route (Firebase appends `mode` and `oobCode`). **Current production:** `https://metrics.chrisvogt.me/verify-email`. Ensure **metrics.chrisvogt.me** appears under **Authentication → Settings → Authorized domains**. When the operator console moves to **chronogrove.com**, update this URL and domains to match the new host.

### Tenant API host: `/widgets` and `/` status rewrite

- **`next.config.mjs`** rewrites **`/widgets/:path*`** to the same Cloud Functions origin as **`/api/widgets/:path*`**, so a custom domain (e.g. `api.customer.example`) can expose clean widget URLs.
- **`GET /api/widgets/:provider`** on Functions accepts optional **`uid`** (Firebase user id) or **`username`** (public slug) query params to pick the data owner on shared hosts like **`api.chronogrove.com`**. Per-tenant domains still use **`WIDGET_USER_ID_BY_HOSTNAME`** on the Functions runtime.
- **`src/proxy.ts`** (Next 16 “middleware”): set **`TENANT_API_ROOT_TO_USERNAME`** or **`NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME`** to comma-separated **`hostname=publicUsername`** entries. For those hosts only, **`/`** is rewritten internally to **`/u/{username}`** (public status page) while the browser URL stays **`/`**.
- **SSR widget checks** on **`/u/[username]`** (and tenant-root **`/`**) use **`NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN`** (or **`SERVER_WIDGET_FETCH_ORIGIN`**) as the fetch base in production, not the browser hostname, so the App Hosting server does not call its own public tenant URL (which often produced **5xx** while browser **`/api/widgets/...`** on the same host still worked). Each probe sends **`x-chronogrove-public-host`** with the browser-visible hostname so Functions applies the same **`WIDGET_USER_ID_BY_HOSTNAME`** / forwarded-host behavior as a normal browser hit. When **`NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME`** maps the request host to the **same** slug as **`/u/[username]`**, probes call **`/api/widgets/:provider`** **without** **`?username=`** so user resolution matches **`/widgets/:provider`** (hostname map). Otherwise **`?username=`** is kept (e.g. console host viewing **`/u/alice`**). Widget **`GET`** rate limits use **per-path** keys so seven parallel SSR checks do not share one IP bucket. **`AuthProvider`** skips **`/api/client-auth-config`** on **`/u/*`** and on **`/`** when the host is listed in the tenant map. Add **`?status_debug=1`** to the public status URL for a one-off **Debug** column with error snippets.
- Canonical public profile URL in product copy: **`https://api.chronogrove.com/u/{username}`** (after that custom domain is attached in Firebase).

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
