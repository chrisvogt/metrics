# Changelog

All notable changes to the root repo (tooling, scripts, CI, and workspace layout) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Package-specific changes:

- **Functions** – [functions/CHANGELOG.md](functions/CHANGELOG.md)

---

## [Unreleased]

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
