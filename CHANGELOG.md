# Changelog

All notable changes to the root repo (tooling, scripts, CI, and workspace layout) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Package-specific changes:

- **Functions** – [functions/CHANGELOG.md](functions/CHANGELOG.md)
- **Hosting** – version in `hosting/package.json`; release notes below.

---

## [Unreleased]

### Changed

- **Dependency updates** – Functions: axios, express-rate-limit 8.x, firebase, firebase-admin, firebase-functions, eslint, globals; @types/node kept at ^24 for Node 24. Hosting: react-router-dom, three 0.183.x (Clock → Timer in FloatingLines). See [functions/CHANGELOG.md](functions/CHANGELOG.md).
- **Functions source layout** – Source previously under `functions/lib/` is now split by role into `config/`, `widgets/`, `utils/`, and `helpers/`. The `functions/lib/` directory is TypeScript build output only and is fully gitignored. See [functions/CHANGELOG.md](functions/CHANGELOG.md).

### Fixed

- **Widget API (functions)** – Public `GET /api/widgets/:provider` responses no longer emit CSRF cookies, so Firebase Hosting / CDN can cache them per `Cache-Control` again. See [functions/CHANGELOG.md](functions/CHANGELOG.md) **0.22.17**.
- **Auth routes (functions)** – `POST /api/auth/session` and `POST /api/auth/logout` are now rate-limited so all authorization routes satisfy CodeQL; session allows 20 req/15 min, logout 30 req/15 min.

## [Hosting 0.3.0] - 2026-03-06

### Added

- **dev:full** – `pnpm run dev:full` starts Functions + Auth emulators and the Vite dev server in one command.

### Fixed

- **API testing (hosting)** – Bypass browser cache for widget, session, and sync test requests so developers always see fresh responses when testing endpoints (no need to disable cache in DevTools).
- **Vite proxy** – When the backend is not running, `/api` requests now return 503 with a JSON message instead of connection errors.

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
