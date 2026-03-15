# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Source layout (config / widgets / utils / helpers)** – Source that lived under `lib/` has been moved into role-based directories so that `lib/` is build output only and can be fully gitignored:
  - **config/** – `constants.ts`, `exported-config.ts` (and tests)
  - **widgets/** – `get-widget-content.ts`, all provider-specific widget getters, `queries/github-widget-content.gql`, and widget tests
  - **utils/** – `extract-json-from-gemini-response.ts` (and test)
  - **helpers/** – `get-user-status.ts`, `get-review.ts` (and get-user-status test)
  - **lib/** – Now contains only `tsc` output; added to `.gitignore`. Run `pnpm run build` before deploy.
  - Imports updated across `index`, `api/`, `jobs/`, `transformers/`, and tests. README and ENVIRONMENT_SETUP.md now reference `config/exported-config.ts`.
- **Dependency upgrades** – Bumped to latest majors: ESLint 10, Vitest 4, dotenv 17, globals 17, requestretry 8. Adjusted for ESLint 10 (preserve-caught-error, no-unassigned-vars), Vitest 4 constructor mocks (use `function` not arrow in mocks), and sync-spotify-data `uploadResult` scope.
- **Dependency updates** – axios 1.13.6, express-rate-limit 8.3.0 (IPv6 subnet grouping; no API changes), firebase 12.10.0, firebase-admin 13.7.0, firebase-functions 7.1.0, eslint 10.0.3, globals 17.4.0. @types/node kept at ^24 for Node 24.
- **Dependency cleanup** – Replaced deprecated packages: `lodash.get` → `lodash/get` (same API); Spotify token refresh now uses `got` instead of `request-promise` (and removed direct `request` / `request-promise` deps). No behavior change.

### Fixed

- **Auth routes** – `POST /api/auth/session` and `POST /api/auth/logout` now use the rate limiter (20 and 30 requests per 15 minutes respectively) so every route that performs authorization is rate-limited (CodeQL compliance).

## [0.22.10] - 2026-03-15

### Changed

- **Widget reads on `DocumentStore`** – Discogs, Instagram, Spotify, and Steam widget readers now load their `widget-content` documents through the shared `DocumentStore` boundary instead of reaching into Firestore directly.
- **Consistent widget paths** – Provider widget reads now use the shared widget document path helpers so public widget loading follows the same provider-neutral storage contract across all supported providers.

### Developer experience

- **Widget reader coverage** – Replaced Firestore-specific widget reader tests with `DocumentStore`-backed coverage and added a dedicated Steam widget reader test to keep the provider read seam well-covered during the migration.

## [0.22.9] - 2026-03-15

### Added

- **CSRF protection** – Added cookie-backed CSRF protection to the functions app using `lusca`, plus a small `/api/csrf-token` helper endpoint so the hosting admin can fetch a token before state-changing requests.

### Changed

- **Admin client auth flow** – The hosting API client now fetches and forwards `X-XSRF-TOKEN` on session creation and logout calls, and the API testing screen now uses that same client path.
- **Protected route handling** – State-changing auth routes now return structured `403` JSON errors when the CSRF token is missing or invalid instead of falling through to generic error handling.

### Developer experience

- **Coverage and tests** – Updated route tests to exercise the CSRF-protected flows and kept the full `functions` suite green after the security hardening.

## [0.22.8] - 2026-03-15

### Added

- **Firebase runtime wrappers** – Added dedicated runtime adapters for Firebase Admin initialization and Firebase Functions registration so admin bootstrap, emulator wiring, and trigger registration are owned outside the service entrypoint.
- **App factory seam** – Added `app/create-express-app.ts` so the API surface can be composed from injected runtime dependencies instead of being defined inline in the Firebase bootstrap file.

### Changed

- **Thin entrypoint** – `index.ts` now acts as a composition layer that wires together runtime config, Firebase runtime adapters, the shared document store, and the Express app factory.
- **Trigger registration** – Scheduled jobs, the HTTP app wrapper, and the before-user-created trigger now register through shared Firebase runtime helpers instead of calling Firebase Functions APIs directly in the entrypoint.

### Developer experience

- **Runtime coverage** – Added focused tests for Firebase admin bootstrap and Firebase Functions registration wrappers while keeping the full `index` and `functions` suites green after the extraction.

## [0.22.7] - 2026-03-15

### Added

- **Runtime config boundary** – Added a provider-neutral runtime config loader in `config/runtime-config.ts` plus focused tests so runtime env/bootstrap behavior is owned by a dedicated seam instead of being embedded directly in the Firebase entrypoint.
- **Firebase runtime adapters** – Added Firebase-specific runtime adapters for exported config loading, Firestore database URL resolution, and emulator wiring under `runtime/` so platform-specific config concerns are isolated from the service layer.

### Changed

- **Entrypoint config loading** – `index.ts` now consumes the runtime config boundary and Firebase adapter modules instead of importing Firebase params and exported-config helpers directly.

### Developer experience

- **Test noise** – Tightened index and sync-job tests to mock logger/console output more explicitly and added direct emulator helper coverage so Firebase-flavored bootstrap behavior is easier to reason about in unit tests.

## [0.22.6] - 2026-03-15

### Added

- **Backend path config overrides** – Added `DEFAULT_WIDGET_USER_ID` and `WIDGET_USER_ID_BY_HOSTNAME` support so the default widget user and hostname-to-user routing can be configured without code changes.

### Changed

- **Provider path resolution** – Replaced precomputed per-user collection and media path constants with runtime path builders so sync jobs, widget reads, and media destination helpers no longer treat one hardcoded username as a structural constant.
- **Provider sync persistence** – Discogs, Goodreads, Instagram, Spotify, Steam, and Flickr persistence paths now resolve through the shared backend path layer, preserving existing document layouts while making alternate deployments easier to configure.

### Developer experience

- **Coverage** – Added focused config/path override tests and updated transformer/widget coverage around the new runtime path resolution.

## [0.22.5] - 2026-03-15

### Added

- **Backend path helpers** – Added explicit user/provider path builders for Firestore collection paths, media prefixes, and widget host-to-user resolution so backend path generation is owned by a dedicated layer instead of scattered string literals.

### Changed

- **Path constants** – Reworked backend collection/media constants to derive from the shared path helpers while preserving the current `chrisvogt` and `chronogrove` behavior.
- **Widget reads** – Flickr and Goodreads widget readers now respect the passed `userId` when building widget-content document paths instead of implicitly reading from the default hardcoded user path.

### Developer experience

- **Coverage** – Added focused tests for the new backend path helpers and updated widget/helper coverage for user-aware widget document paths.

## [0.22.4] - 2026-03-14

### Added

- **Media storage seam** – Added a provider-neutral `MediaStore` abstraction with GCS and local-disk adapters so media-heavy sync flows can switch storage backends without changing provider logic.
- **Local media serving** – Added a local `/api/media/*` route for development so disk-backed uploads can be viewed through the same API surface used by widget media URLs.

### Changed

- **Media upload/list helpers** – Switched the shared cloud-storage helpers to delegate through the new media storage selector, preserving current GCS behavior in production while defaulting to disk in local development.
- **Runtime config mapping** – Added `MEDIA_STORE_BACKEND` and `LOCAL_MEDIA_ROOT` support to exported-config/env setup so storage backend selection is environment-driven.

### Fixed

- **Local dotenv loading** – Functions now load `functions/.env` synchronously from a stable path in development so browser-triggered emulator requests use the same local storage/media settings consistently.

### Developer experience

- **Coverage** – Added focused adapter, selector, helper, and sync-job coverage for the new media storage seam and local-disk flow.

## [0.22.3] - 2026-03-14

### Changed

- **Widget read seam** – Moved Flickr and Goodreads widget document reads onto the `DocumentStore` boundary while keeping the existing Firestore document layout and API payload shapes unchanged.
- **Widget loading path** – `getWidgetContent` now accepts an injected `DocumentStore` so the widget API route can pass the shared storage adapter through the read path instead of instantiating Firestore-specific readers.

### Fixed

- **Timestamp normalization** – Centralized widget read-side timestamp conversion for `meta.synced` values so Firestore timestamp-like objects and `toDate()` wrappers are handled consistently at the read boundary.

### Developer experience

- **Coverage** – Added focused tests for `DocumentStore`-backed widget readers and the shared widget document-store helper to keep the backend decoupling seam well covered.

## [0.22.2] - 2026-03-07

### Security

- **CORS** – Removed temporary domain `8ms.4a9.mytemp.website` from the production CORS allowlist. Unit test for that origin removed.

### Changed

- **Hosting (sign-in page)** – Clarified that the app is a personal admin, not a general login service:
  - Added line under “Sign in”: “Personal admin for metrics.chrisvogt.me / chrisvogt.me only.”
  - Added “← Part of chrisvogt.me” link to chrisvogt.me above the sign-in card.
  - Added meta description and Open Graph tags in `index.html`: “Personal Metrics API admin for chrisvogt.me. Not a general login service.”

## [0.22.1] - 2026-03-06

### Fixed

- **Build** – Copy `queries/` (e.g. `github-widget-content.gql`) into `lib/queries/` during build so the GitHub widget loader finds the file at runtime in emulator and production.

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
