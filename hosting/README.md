# Chronogrove hosting (Next.js app)

Next.js operator console for the Chronogrove API: sign-in (Google / email / phone), schema, status, and sync testing. Production builds are deployed with **Firebase App Hosting** (SSR); the Cloud Function `app` still serves **`/api/**`** (rewritten in `next.config.ts` in prod, and via the dev proxy locally).

The repo is a **pnpm + Turborepo** monorepo. Run all commands from the **repo root** with `pnpm run …` (see root [README](../README.md#monorepo) for the full command list).

## Setup

From the repo root, a single install covers everything:

```bash
pnpm install
```

## Develop locally

**Option A – Next.js dev server (hot reload)**  
Run the app and proxy `/api` to the Cloud Functions emulator (`next.config.ts` `beforeFiles` rewrites; dev only):

```bash
# from repo root
pnpm run dev
```

Start the Functions (and Auth) emulators in another terminal so `/api` works:

```bash
# from repo root
firebase emulators:start --only functions,auth
```

Then open **http://localhost:5173**.

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

Next.js output is under **`hosting/.next`** (SSR bundle for App Hosting). The root scripts run this build before App Hosting deploys.

## Deploy

From the **repo root**:

- **App Hosting (production backend `chronogrove-console`):** `pnpm run deploy:hosting` — runs a workspace build, then `firebase deploy --only apphosting:chronogrove-console`.
- **Rules + Functions + App Hosting:** `pnpm run deploy:all` — deploys Firestore, Functions, and the production App Hosting backend (see root `package.json` for exact `--only` list).

Backends and **`hosting/apphosting.yaml`** must exist in the Firebase project. CI can deploy after the **CI** workflow succeeds (see root [README](../README.md#deployment)).

## Routes

| Path | Purpose |
|------|---------|
| `/schema/` | API schema reference |
| `/status/` | Health checks |
| `/auth/` | Sign-in UI |
| `/endpoints/` | Authenticated API testing (not `/api/…` — that prefix is reserved for the Cloud Function) |
| `/sync/` | Sync testing (manual sync via JSON or **SSE** `/api/widgets/sync/:provider/stream`) |
