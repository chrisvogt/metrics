# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Dependency upgrades** – Bumped to latest majors: ESLint 10, Vitest 4, dotenv 17, globals 17, requestretry 8. Adjusted for ESLint 10 (preserve-caught-error, no-unassigned-vars), Vitest 4 constructor mocks (use `function` not arrow in mocks), and sync-spotify-data `uploadResult` scope.
- **Dependency cleanup** – Replaced deprecated packages: `lodash.get` → `lodash/get` (same API); Spotify token refresh now uses `got` instead of `request-promise` (and removed direct `request` / `request-promise` deps). No behavior change.

## [0.22.0] - 2025-02-14

### Added

- **Goodreads recently-read fallback** – When Google Books returns no result for an ISBN, the recently-read flow now tries a title/author search (same behavior as profile updates), so more books are recovered (e.g. *Culture of Desire*, *Purposeful*, *Outliers*). Title and author are read from the Goodreads review list XML.

### Changed

- **Google Books “not found” logging** – A missing ISBN result is now logged at **info** (“No result from Google Books for ISBN: …; title/author fallback may be used.”) instead of an error. A **warning** is logged only when a book is not found by either ISBN or the title/author fallback.

## [0.21.0] - 2025-02-14

### Added

- **React hosting app** – The metrics dashboard is now a Vite + React app in `hosting/`:
  - Sign-in (Google, email/password, phone) and API testing UI
  - Two pages when signed in: **API** (auth token, session, widget GET) and **Sync** (sync-by-provider)
  - Firebase config loaded at runtime from `/api/firebase-config`; no client-side keys
  - Dedicated `hosting/package.json` and build output in `hosting/dist`

### Changed

- **Firebase Hosting** – `firebase.json` now serves the built React app:
  - `hosting.public` set to `hosting/dist` (replaces legacy `public/` static files)
  - Rewrites: `/api/**` → Cloud Function `app`, `**` → `/index.html` (SPA fallback)
- **Root scripts** – From repo root (pnpm + Turborepo): `pnpm run build` builds the hosting app; `pnpm run deploy:all` builds then deploys; `pnpm run deploy:hosting` builds and deploys hosting only.

### Developer experience

- Local dev: from repo root run `pnpm run dev` with Functions + Auth emulators, or build and use `firebase emulators:start --only hosting,functions,auth`. See root [README](../README.md) and [hosting/README.md](../hosting/README.md).

## [0.20.2] - 2025-02-14

### Fixed

- **AI summaries (Steam & Goodreads)** – Summaries were failing due to Gemini API changes:
  - Parse both markdown-wrapped and raw JSON responses (shared `extractJsonFromGeminiResponse` helper)
  - Use `gemini-2.0-flash` model (replaces deprecated `gemini-1.5-flash`)
  - Removed debug logging from summary generators
- **Steam widget** – `getSteamWidgetContent` now returns a safe default when the `widget-content` doc is missing instead of throwing
- Log message typo: "Goodreadsn" → "Goodreads" in sync-goodreads-data

### Changed

- `.env.template`: Documented that `GEMINI_API_KEY` must not be restricted to HTTP referrers when used from Firebase Functions

## [0.20.1] - 2025-02-14

### Changed

- **Express 5** – Upgraded from Express 4 to 5:
  - Catch-all 404 route updated to use named wildcard `/{*splat}` (Express 5 path syntax)
  - Rate limiter now uses `req.socket?.remoteAddress` instead of deprecated `req.connection.remoteAddress`
- Removed `packageManager` from `package.json` (project uses npm)

## [0.20.0] - 2025-02-14

### Changed

- **Node.js 24** – Upgraded the project to Node 24 everywhere to address Firebase deprecation warnings and align with Firebase's full Node 24 support:
  - Root `package.json` and `functions/package.json`: `engines.node` set to `>=24`
  - `firebase.json`: Cloud Functions runtime set to `nodejs24`
  - `.nvmrc`: set to `24` for local development
  - GitHub Actions CI (`.github/workflows/ci.yml`): `node-version` set to `24`

## [0.19.0] - 2025-02-13

### Added

- Book cover images for Goodreads activity updates (userstatus and review types)
- Automatic fetching of book metadata from Google Books API for updates without existing book data
- Fallback search by title/author when ISBN lookup fails
- Deduplication of book fetches for updates referencing the same book
- Rate limiting protection with exponential backoff for Google Books API requests
- Comprehensive test coverage for `processUpdatesWithMedia` function (97%+ coverage)

### Changed

- Enhanced `sync-goodreads-data` job to process updates and attach CDN media URLs
- Improved error handling for Google Books API quota exceeded errors

## [0.18.0] - 2024-12-XX

### Added

- GitHub contribution graph data to GitHub widget
- `contributionsCollection` with contribution calendar data for the last 365 days
- Comprehensive test coverage for GitHub widget content function (100% code coverage)
- GitHub widget option to API dashboard dropdown for testing
- Contribution data includes date, contribution count, and color for each day to enable flame graph visualization

### Changed

- GraphQL query now includes contribution calendar with total contributions, weeks, and daily contribution data

## [0.17.0] - 2024-XX-XX

### Added

- Comprehensive Firebase Authentication system with secure session management
- Firebase Auth integration with user creation/deletion triggers for automatic database management
- Secure session cookie support as primary authentication method (HTTP-only, secure, SameSite)
- Rate limiting middleware to prevent API abuse (10 sync requests per 15 minutes)
- Domain-based access control restricting access to @chrisvogt.me and @chronogrove.com users only
- Protected endpoints: `/api/user/profile`, `/api/auth/session`, `/api/auth/logout`
- Automatic token verification and refresh token management
- Comprehensive test coverage for all authentication flows (100% code coverage)
- Firebase emulator support for development and testing environments
- User management jobs for automatic database synchronization with Firebase Auth
- Enhanced logging and error handling throughout authentication system

### Changed

- Updated CORS configuration to support credentials for cross-origin cookie handling

### Security

- **BREAKING**: Sync endpoints now require authentication (JWT token or session cookie)

## [0.16.0] - 2024-XX-XX

### Added

- Comprehensive Discogs integration for vinyl record collection tracking
- Discogs API integration to fetch user's vinyl record collection and releases
- Discogs sync job to periodically update collection data from Discogs API
- Discogs widget content function to serve collection data to frontend
- Data transformers for Discogs releases and destination path handling
- Comprehensive test coverage for all Discogs functionality (100% code coverage)
- Discogs API configuration and environment variables
- Integration follows existing multi-tenant architecture patterns

## [0.15.0] - 2024-XX-XX

### Added

- AI-powered reading summary to Goodreads widget using Google Gemini
- Intelligent 2-3 paragraph summaries of reading activity and patterns
- AI analysis of recent books, genre preferences, and standout reads
- Comprehensive test coverage for new AI summary functionality (100% code coverage)
- Graceful fallback handling when AI summary generation fails
- AI summaries cached separately and can be regenerated independently of book data

### Changed

- Enhanced Goodreads sync job to generate and store AI summaries separately for widget consumption
- Increased Goodreads API fetch limit from 18 to 100 books for better reading pattern analysis

## [0.14.0] - 2024-XX-XX

### Added

- Multi-tenant support for Instagram widget
- Hostname-based user detection in API endpoints (chronogrove.com → chronogrove, others → chrisvogt)
- Comprehensive test coverage for Instagram widget (100% code coverage)

### Changed

- Instagram widget now supports dynamic user-based collection names (`users/{userId}/instagram`)

### Fixed

- Linter warnings and improved error handling in Instagram widget

## [0.13.0] - 2024-XX-XX

### Added

- `CURRENT_USERNAME` constant for future multi-tenant configuration
- Foundation ready for Firebase Auth and OAuth integration for multiple users

### Changed

- **BREAKING**: Migrated database structure to user-scoped collections for multi-tenant support
- All database collections now use `users/chrisvogt/` prefix (e.g., `users/chrisvogt/spotify/widget-content`)
- Storage paths updated to be user-scoped (e.g., `chrisvogt/spotify/playlists/`)
- Updated all sync jobs and widget content functions to use new user-scoped paths

## [0.12.0] - 2024-XX-XX

### Added

- AI summary to the Steam widget content using Gemini via Firebase

## [0.11.2] - [0.11.5] - 2024-XX-XX

### Changed

- Package dependency updates

## [0.11.1] - 2024-XX-XX

### Security

- Disabled all sync/* endpoints until auth is implemented

## [0.11.0] - 2024-XX-XX

### Changed

- **BREAKING**: Updated package from CommonJS to ESM

## [0.10.1] - 2024-XX-XX

### Changed

- Improved code coverage

## [0.10.0] - 2024-XX-XX

### Added

- Vitest testing framework
- First unit test spec file

## [0.9.1] - 2024-XX-XX

### Fixed

- Steam icon URL to use HTTPS instead of HTTP

## [0.9.0] - 2024-XX-XX

### Added

- `ownedGames` to the Steam widget API response

## [0.8.0] - 2024-XX-XX

### Added

- Additional fields from Instagram API: biography, followersCount
- Additional response information to the Instagram sync API response when no images were uploaded
- This changelog

---

_This changelog was started with v0.8.0._

[0.22.0]: https://github.com/chrisvogt/metrics/compare/v0.21.0...v0.22.0
[0.21.0]: https://github.com/chrisvogt/metrics/compare/v0.20.2...v0.21.0
[0.20.0]: https://github.com/chrisvogt/metrics/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/chrisvogt/metrics/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/chrisvogt/metrics/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/chrisvogt/metrics/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/chrisvogt/metrics/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/chrisvogt/metrics/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/chrisvogt/metrics/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/chrisvogt/metrics/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/chrisvogt/metrics/compare/v0.11.5...v0.12.0
[0.11.2]: https://github.com/chrisvogt/metrics/compare/v0.11.1...v0.11.2
[0.11.1]: https://github.com/chrisvogt/metrics/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/chrisvogt/metrics/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/chrisvogt/metrics/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/chrisvogt/metrics/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/chrisvogt/metrics/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/chrisvogt/metrics/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/chrisvogt/metrics/releases/tag/v0.8.0
