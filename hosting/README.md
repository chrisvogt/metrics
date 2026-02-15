# Metrics Hosting (React app)

React dashboard for the Metrics API: sign-in (Google / email / phone) and API testing.

The repo is a **pnpm + Turborepo** monorepo. Run all commands from the **repo root** with `pnpm run …` (see root [README](../README.md#monorepo) for the full command list).

## Setup

From the repo root, a single install covers everything:

```bash
pnpm install
```

## Develop locally

**Option A – Vite dev server (hot reload)**  
Run the app and proxy `/api` to the Cloud Functions emulator:

```bash
# from repo root
pnpm run dev
```

Start the Functions (and Auth) emulators in another terminal so `/api` works:

```bash
# from repo root
firebase emulators:start --only functions,auth
```

Then open http://localhost:5173. The Vite proxy forwards `/api` to the emulator.

**Option B – Firebase Hosting + Functions emulators**  
Build once, then run both hosting and functions so `/api` rewrites hit the emulated function:

```bash
# from repo root
pnpm run build
firebase emulators:start --only hosting,functions,auth
```

Open the Hosting URL (e.g. http://metrics.dev-chrisvogt.me:8084). The same `firebase.json` rewrites send `/api/**` to the emulated `app` function.

## Build

From the repo root:

```bash
pnpm run build
```

Output is in `hosting/dist`. The root scripts `deploy:all` and `deploy:hosting` run this before deploying.

## Deploy

From the **repo root**:

- **Hosting only:** `pnpm run deploy:hosting` (builds then deploys hosting)
- **Full deploy:** `pnpm run deploy:all` (builds hosting, then deploys hosting + functions + other targets)

Firebase Hosting serves files from `hosting/dist` and rewrites `/api/**` to the `app` Cloud Function and `**` to `/index.html` for the SPA.
