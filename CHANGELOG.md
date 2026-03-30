# Changelog

All notable changes to the root repo (tooling, scripts, CI, and workspace layout) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Package-specific changes:

- **Functions** – [functions/CHANGELOG.md](functions/CHANGELOG.md)
- **Hosting** – [hosting/CHANGELOG.md](hosting/CHANGELOG.md)

---

## [Unreleased]

### Changed

- **Functions 0.25.4** — Goodreads widget requests **35** shelf rows (30 display + **5** buffer) so failed lookups are less likely to shrink the grid below 30 titles. See [functions/CHANGELOG.md](functions/CHANGELOG.md).
- **Functions 0.25.3** — Lazy backend bootstrap in the Firebase entrypoint so deploy-time export discovery no longer reads `STORAGE_FIRESTORE_DATABASE_URL.value()` early; tests updated for first-request initialization. See [functions/CHANGELOG.md](functions/CHANGELOG.md).
- **Functions 0.25.2** — Goodreads AI summary: prompt allows two or three `<p>` blocks; stored HTML is no longer truncated to two paragraphs (homepage handles “Read more”). See [functions/CHANGELOG.md](functions/CHANGELOG.md).
- **Hosting 0.6.2** — Overview home cards show Discogs and Goodreads metrics (record-shaped `metrics` and Goodreads fallbacks). See [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Functions 0.25.1** — Global `/api` CORS (before CSRF) so OPTIONS preflight works for cross-origin sync SSE to Cloud Functions. See [functions/CHANGELOG.md](functions/CHANGELOG.md).
- **Hosting 0.6.1** — Manual sync SSE requests use the Cloud Functions URL so streams are not buffered by Firebase Hosting; Vitest coverage for `baseUrl` helpers. See [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Hosting** – Admin UI migrated from Vite to **Next.js 15** (App Router, static export to `hosting/out`); docs and changelogs updated. Firebase Hosting no longer uses an SPA catch-all rewrite (unknown URLs → `404.html`). See [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Hosting 0.5.0** – Schema documents manual sync **SSE** (`/stream`); JsonCodeBlock examples; Sync page streams progress. See [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Functions 0.25.0** – Manual sync **`GET /api/widgets/sync/:provider/stream`**, `onProgress` across provider sync jobs, compression bypass for SSE. See [functions/CHANGELOG.md](functions/CHANGELOG.md).
- **Hosting 0.4.0** – Admin UI: Schema and Status pages, layout and header auth, build-time git SHA. See [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Functions 0.23.0** – Firestore-backed sync job queue, breaking change to `GET /api/widgets/sync/:provider` JSON, Instagram `INSTAGRAM_USER_ID` and Graph fetch updates. See [functions/CHANGELOG.md](functions/CHANGELOG.md) **0.23.0** (BREAKING).
- **Dependency updates** – Functions: axios, express-rate-limit 8.x, firebase, firebase-admin, firebase-functions, eslint, globals; @types/node kept at ^24 for Node 24. Hosting: Next.js 15, three 0.183.x, `@types/three` (Clock → Timer in FloatingLines; Vite and `react-router-dom` removed). See [functions/CHANGELOG.md](functions/CHANGELOG.md) and [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Functions source layout** – Source previously under `functions/lib/` is now split by role into `config/`, `widgets/`, `utils/`, and `helpers/`. The `functions/lib/` directory is TypeScript build output only and is fully gitignored. See [functions/CHANGELOG.md](functions/CHANGELOG.md).
- **Functions test coverage** – New/expanded tests (CSRF validate, Google Books type guard, GCS errors, rate-limit forwarded-for, sync metrics, Gemini prompt branches, Express 5 error middleware, runtime-config non-Error catch); Vitest coverage thresholds and excludes for `scripts/**/*.cjs` and `list-stored-media` re-export; removed unreachable duplicate check after `getSessionAuthError` on `POST /api/auth/session`.

### Fixed

- **Hosting 0.6.4** — Local builds and deploys now stamp the hosting bundle with the current git SHA and include that SHA in the Turbo cache key, preventing stale sidebar SHAs from reused `hosting/out` artifacts. See [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Hosting 0.6.3** — Firebase Hosting `Cache-Control` headers for the static export (revalidate HTML/shell, immutable `/_next/static` chunks) to avoid stale shells and post-deploy `ChunkLoadError`. See [hosting/CHANGELOG.md](hosting/CHANGELOG.md).
- **Widget API (functions)** – Public `GET /api/widgets/:provider` responses no longer emit CSRF cookies, so Firebase Hosting / CDN can cache them per `Cache-Control` again. See [functions/CHANGELOG.md](functions/CHANGELOG.md) **0.22.17**.
- **Auth routes (functions)** – `POST /api/auth/session` and `POST /api/auth/logout` are now rate-limited so all authorization routes satisfy CodeQL; session allows 20 req/15 min, logout 30 req/15 min.

## [1.0.0] - 2025-02-14

### Added

- **pnpm workspaces** – Monorepo layout with `pnpm-workspace.yaml`; `hosting` and `functions` are workspace packages. Single `pnpm install` at root installs all dependencies; lockfile is `pnpm-lock.yaml`.
- **Turborepo** – Task runner and caching for `build`, `dev`, `lint`, `test`, and `test:coverage`. Root scripts delegate to Turbo; only packages that define a script run it (e.g. only hosting has `build`).
- **Root scripts** – `pnpm run build`, `pnpm run dev`, `pnpm run lint`, `pnpm run test`, `pnpm run test:coverage`, plus `deploy:all`, `deploy:hosting`, `deploy:functions`.

### Changed

- **Package manager** – Switched from npm to pnpm (v9.15.0). Use `pnpm install` at root; do not run npm in `hosting/` or `functions/`.
- **CI/CD** – All workflows use `pnpm/action-setup`, `cache: "pnpm"`, and `pnpm install --frozen-lockfile`. CI runs `pnpm run lint` and `pnpm run test:coverage`; deploy workflows run `pnpm run build`.
- **Lockfiles** – Removed `hosting/package-lock.json` and `functions/package-lock.json` in favor of a single root `pnpm-lock.yaml`.

### Developer experience

- **`.turbo`** – Added to `.gitignore` (Turborepo local cache).
- **Node** – Engines remain `>=24`; CI uses Node 24.
