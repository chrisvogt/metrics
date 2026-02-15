# Metrics Hosting (React app)

React dashboard for the Metrics API: sign-in (Google / email / phone) and API testing.

## Setup

```bash
npm install
```

## Develop locally

**Option A – Vite dev server (hot reload)**  
Run the app and proxy `/api` to the Cloud Functions emulator:

```bash
npm run dev
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
npm run build
# from repo root
firebase emulators:start --only hosting,functions,auth
```

Open the Hosting URL (e.g. http://metrics.dev-chrisvogt.me:8084). The same `firebase.json` rewrites send `/api/**` to the emulated `app` function.

## Build

```bash
npm run build
```

Output is in `dist/`. The repo root’s `build` and `deploy` scripts run this from the root.

## Deploy

From the **repo root**:

- **Hosting only:** `npm run deploy:hosting` (builds then deploys hosting)
- **Full deploy:** `npm run deploy` (builds hosting, then deploys hosting + functions + other targets)

Firebase Hosting serves files from `hosting/dist` and rewrites `/api/**` to the `app` Cloud Function and `**` to `/index.html` for the SPA.
