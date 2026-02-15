# Metrics Functions (backend)

Firebase Cloud Functions backend for the Metrics API: an Express app that serves widget and auth endpoints, plus scheduled jobs that sync data from external APIs (Spotify, Steam, Goodreads, Instagram, Discogs, Flickr) into Firestore.

## Directory layout

- **`lib/`** – Shared helpers and config: widget content getters, constants, exported-config mapping, utilities.
- **`api/`** – External API clients (Goodreads, Spotify, Steam, Discogs, Instagram, Flickr, Google Books, Gemini, Cloud Storage).
- **`jobs/`** – Sync jobs (e.g. `sync-spotify-data`, `sync-goodreads-data`) and user lifecycle (create-user, delete-user).
- **`transformers/`** – Data shaping for storage and widgets (e.g. Discogs releases, Instagram media).
- **`middleware/`** – Express middleware (e.g. rate limiter).
- **`selectors/`** – Config selectors.
- **`scripts/`** – Standalone scripts (e.g. env setup).
- **`queries/`** – GraphQL query files (e.g. GitHub widget).

Entry point is **`index.js`**: it defines the HTTP function, scheduled functions, and auth triggers.

## Setup, run, deploy

- **Environment:** See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for `.env` (local) and production secret (`FUNCTIONS_CONFIG_EXPORT`).
- **Install, build, deploy:** Use the **repo root**. See the root [README](../README.md#monorepo) for all commands (`pnpm install`, `pnpm run build`, `pnpm run deploy:all`, etc.). Do not run `pnpm install` inside `functions/`; use the root.

## Tests and lint

From the **repo root**:

- **Tests (single run):** `pnpm run test`
- **Tests (watch):** `pnpm --filter metrics-functions run test:watch`
- **Tests (coverage):** `pnpm run test:coverage`
- **Lint:** `pnpm run lint`
