# Chronogrove console (Next.js app)

Next.js operator console for the Chronogrove API: sign-in (Google / email / phone), schema, status, sync testing, and **public tenant status** pages. Production builds are deployed with **Firebase App Hosting** (SSR); the Cloud Function `app` still serves **`/api/**`** (rewritten in `next.config.mjs` in prod, and via the dev emulator URL locally). **`/widgets/**`** is rewritten the same way to **`/api/widgets/**`** on Functions.

The repo is a **pnpm + Turborepo** monorepo. Run all commands from the **repo root** with `pnpm run …` (see root [README](../README.md#monorepo) for the full command list).

## Setup

From the repo root, a single install covers everything:

```bash
pnpm install
```

## Develop locally

**Option A – Next.js dev server (hot reload)**  
Run the app and proxy **`/api`** and **`/widgets`** to the Cloud Functions emulator (`next.config.mjs` `beforeFiles` rewrites; dev only):

```bash
# from repo root
pnpm run dev
```

Start the Functions (and Auth) emulators in another terminal so **`/api`** and **`/widgets`** rewrites work:

```bash
# from repo root
firebase emulators:start --only functions,auth
```

Then open **http://localhost:5173**.

**Environment overrides** — Copy [`.env.template`](.env.template) to **`.env.local`** in this directory (`apps/console/`). Next.js loads `.env.local` automatically when you run `next dev` here (restart after edits). Use it for `NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME`, custom `NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN`, etc.

**Option B – `dev:full` from repo root**  
Starts **Auth, Firestore, and Functions** emulators plus Next dev. App Hosting is **not** started here (it would try to run a second `next dev` on the same port). Use Option A split terminals if you omit Firestore during UI-only work.

```bash
pnpm run dev:full
```

**Option C – App Hosting emulator (optional)**  
Closer to the App Hosting runtime; use when you need to validate `apphosting.yaml` or emulator-only behavior (separate from day-to-day `localhost:5173`).

```bash
firebase emulators:start --only apphosting,auth,functions,firestore
```

Open **http://metrics.dev-chrisvogt.me:8084** (map that host to `127.0.0.1` in `/etc/hosts` if needed).

## Build

From the repo root:

```bash
pnpm run build
```

Next.js output is under **`apps/console/.next`** (SSR bundle for App Hosting). The root scripts run this build before App Hosting deploys.

**App Hosting:** keep the **`next`** dependency in **`package.json`** as an **exact** semver (e.g. **`"16.2.4"`**, not **`^16.2.4`**). Firebase’s **`@apphosting/adapter-nextjs`** CVE gate passes that string to **`semver.satisfies`**; range strings are rejected and the remote build fails. See [docs/APP_HOSTING.md](../docs/APP_HOSTING.md#nextjs-version-string-appsconsolepackagejson).

## Deploy

From the **repo root**:

- **App Hosting (production backend `chronogrove-console`):** `pnpm run deploy:hosting` — runs a workspace build, then `firebase deploy --only apphosting:chronogrove-console`.
- **Rules + Functions + App Hosting:** `pnpm run deploy:all` — deploys Firestore, Functions, and the production App Hosting backend (see root `package.json` for exact `--only` list).

Backends and **`apps/console/apphosting.yaml`** must exist in the Firebase project. **CI** runs lint, tests, and build only. Releases usually go through the **Firebase** GitHub integration; the commands above are for CLI deploy from the repo root (see root [README](../README.md#deployment)).

### App Hosting backends

| Backend ID | Role |
|------------|------|
| **`chronogrove-console`** | Production console (`pnpm run deploy:hosting`). |
| **`chronogrove-console-pr`** | Optional second backend (e.g. staging/previews); deploy with `firebase deploy --only apphosting:chronogrove-console-pr` when configured in the Firebase project. |

Both use **`rootDir`** `apps/console/` in [`firebase.json`](../firebase.json). See **[docs/APP_HOSTING.md](../docs/APP_HOSTING.md)** for run config, env vars, and operations detail.

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
