# Changelog

All notable changes to **chronogrove-www** (the Vite + React marketing site on Firebase Hosting classic) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-04-05

### Added

- **`src/config.ts`** — `CONSOLE_ORIGIN` and `API_ORIGIN` switch between production URLs and local dev URLs with explicit ports (`console.dev-chronogrove.com:5173`, `api.dev-chronogrove.com:5001`) when `import.meta.env.DEV` is true.

### Changed

- **`vite.config.ts`** — `server.allowedHosts` includes `dev-chronogrove.com` and `localhost` so the dev server accepts custom `/etc/hosts` hostnames.

### Documentation

- Root [README.md](../../README.md) and [docs/LOCAL_DEV.md](../../docs/LOCAL_DEV.md) document optional local hostnames, ports, Firebase Auth **authorized domains**, and `pnpm dev:full`.

## [0.1.0] - 2026-04-05

### Added

- Initial marketing site: Vite + React + TypeScript + Three.js particle hero, sections (How it works, API snippet, features grid, CTA), Sonoran Dusk design tokens, parallax via `--scroll-y`, `pnpm` workspace package `chronogrove-www`, Firebase Hosting `www` target (`firebase.json`).
