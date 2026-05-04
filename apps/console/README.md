# Chronogrove console (Next.js app)

Next.js operator console for the Chronogrove API: sign-in (Google / email / phone), schema, status, sync testing, and **public tenant status** pages. Production builds are deployed with **Firebase App Hosting** (SSR); the Cloud Function `app` still serves **`/api/**`** (rewritten in `next.config.mjs` in prod, and via the dev emulator URL locally). **`/widgets/**`** is rewritten the same way to **`/api/widgets/**`** on Functions.

The repo is a **pnpm + Turborepo** monorepo. Run all commands from the **repo root** with `pnpm run …` (see root [README](../README.md#monorepo) for the full command list).

## Setup

From the repo root, a single install covers everything:

```bash
pnpm install
```

## Develop locally

Run commands from the **repo root** so you use the workspace **`package.json`** scripts (see root [README § Commands](../README.md#commands-repo-root)).

**Recommended — one terminal**

```bash
pnpm run dev:full
```

Starts **Auth, Firestore, and Functions** emulators plus **`pnpm run dev`** (Next.js on **http://localhost:5173**). Same emulator set as **`pnpm run emulators`**; the App Hosting emulator is **not** used (avoids a second Next dev on the same port).

**After changing generated assets or wanting a clean build first**

```bash
pnpm run dev:full:fresh
```

**Split terminals (same behavior as `dev:full`)**

```bash
# terminal 1
pnpm run emulators

# terminal 2
pnpm run dev
```

Then open **http://localhost:5173**.

**Environment overrides** — Copy [`.env.template`](.env.template) to **`.env.local`** in this directory (`apps/console/`). Next.js loads `.env.local` when Turbo runs **`chronogrove-console#dev`** from the root (restart after edits). Use it for `NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME`, custom `NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN`, etc.

**App Hosting emulator** (optional, not part of day-to-day local dev): see [docs/APP_HOSTING.md](../docs/APP_HOSTING.md#optional-app-hosting-emulator).

## Build

From the repo root:

```bash
pnpm run build
```

Next.js output is under **`apps/console/.next`** (SSR bundle for App Hosting). The root scripts run this build before App Hosting deploys.

**App Hosting:** keep the **`next`** dependency in **`package.json`** as an **exact** semver (e.g. **`"16.2.4"`**, not **`^16.2.4`**). Firebase’s **`@apphosting/adapter-nextjs`** CVE gate passes that string to **`semver.satisfies`**; range strings are rejected and the remote build fails. See [docs/APP_HOSTING.md](../docs/APP_HOSTING.md#nextjs-version-string-appsconsolepackagejson).

## Deploy

From the **repo root**:

- **`pnpm run deploy:hosting`** — workspace build, then production App Hosting backend **`chronogrove-console`**.
- **`pnpm run deploy:all`** — guard, workspace build, then Firestore rules, Functions, and **`chronogrove-console`** (see root `package.json`).

Backends and **`apps/console/apphosting.yaml`** must exist in the Firebase project. **CI** runs lint, tests, and build only. Releases usually go through the **Firebase** GitHub integration; the scripts above are for CLI deploy from the repo root (see root [README](../README.md#deployment)).

### App Hosting backends

| Backend ID | Role |
|------------|------|
| **`chronogrove-console`** | Production console (`pnpm run deploy:hosting`). |
| **`chronogrove-console-pr`** | Optional second backend (e.g. staging/previews); CLI deploy is documented in **[docs/APP_HOSTING.md](../docs/APP_HOSTING.md)** (no separate root script today). |

Both use **`rootDir`** `apps/console/` in [`firebase.json`](../firebase.json). See **[docs/APP_HOSTING.md](../docs/APP_HOSTING.md)** for run config, env vars, deploy flags, and optional emulator use.

## Routes

| Path | Purpose |
|------|---------|
| `/schema/` | API schema reference |
| `/status/` | Health checks |
| `/auth/` | Sign-in UI |
| `/endpoints/` | Authenticated API testing (not `/api/…` — that prefix is reserved for the Cloud Function) |
| `/sync/` | Sync testing (manual sync via JSON or **SSE** `/api/widgets/sync/:provider/stream`) |
| `/u/[username]` | Public widget API status (SSR). Append **`?status_debug=1`** for a one-off debug column on failed probes. |
| `/` | On hosts listed in **`NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME`** (or **`TENANT_API_ROOT_TO_USERNAME`**), internally the same as **`/u/{slug}`**; URL bar stays **`/`** (`src/proxy.ts`). |
| `/widgets/...` | Browser-facing alias: rewritten to **`/api/widgets/...`** on Cloud Functions (same origin). |
