<h1 align='center'>
  Social Metrics API (<a href='https://metrics.chrisvogt.me' title='metrics.chrisvogt.me'>metrics.chrisvogt.me</a>)
</h1>

<p align='center'>
  <a href='https://github.com/chrisvogt/metrics/actions/workflows/ci.yml'>
    <img src='https://github.com/chrisvogt/metrics/actions/workflows/ci.yml/badge.svg?branch=main' alt='Continuous Integration badge' />
  </a>
  <a href='https://github.com/chrisvogt/metrics/actions/workflows/codeql.yml'>
    <img src='https://github.com/chrisvogt/metrics/actions/workflows/codeql.yml/badge.svg?branch=main' alt='CodeQL badge' />
  </a>
  <a href='https://codecov.io/gh/chrisvogt/metrics'>
    <img src='https://codecov.io/gh/chrisvogt/metrics/branch/main/graph/badge.svg?token=Hr0GpQiCu0' alt='Code coverage report badge.' />
  </a>
</p>

This repository contains a Firebase-backed service I use to fetch and sync data for widgets on my personal website, [www.chrisvogt.me](https://www.chrisvogt.me).

## Features

- **Multi-Platform Data Sync**: Integrates with Spotify, Steam, Goodreads, Instagram, Discogs, and Flickr
- **Firebase Authentication**: Secure user authentication with email/password, phone, and Google sign-in
- **Session Management**: Secure session cookies with JWT token fallback
- **Real-time Data**: Live data fetching and caching for widget content
- **Local Development**: Full Firebase emulator support for development

## How to install

### Prerequisites

- **Node.js** (version in [.nvmrc](./.nvmrc), e.g. 24)
- **pnpm** (e.g. `corepack enable && corepack prepare pnpm@9.15.0 --activate`, or see [pnpm.io](https://pnpm.io/installation))
- **Firebase CLI** (`pnpm add -g firebase-tools` or `npm install -g firebase-tools`)
- **Firebase project** and `firebase login`

### Install steps

1. **Clone and install all dependencies**
   ```bash
   git clone git@github.com:chrisvogt/metrics.git
   cd metrics
   pnpm install
   ```
   This installs dependencies for the root, `hosting/`, and `functions/` in one go (see [Monorepo](#monorepo) below).

2. **Configure environment (local development)**  
   In `functions/`, copy the env template and set values (see [Environment variables](#environment-variables) below):
   ```bash
   cp functions/.env.template functions/.env
   # Edit functions/.env (CLIENT_API_KEY, CLIENT_AUTH_DOMAIN, CLIENT_PROJECT_ID, etc.)
   ```

### Environment variables

For local development, copy the template and set your values:

```bash
# In the /functions directory
cp .env.template .env
# Edit .env with your actual values
```

**Important:** Never commit `functions/.env` to version control. It contains sensitive information like API keys.

#### Required Environment Variables

The following variables are required for the authentication system to work:

- `CLIENT_API_KEY` - Your Firebase API key
- `CLIENT_AUTH_DOMAIN` - Your Firebase auth domain (e.g., `your-project.firebaseapp.com`)
- `CLIENT_PROJECT_ID` - Your Firebase project ID

#### Optional Environment Variables

- `NODE_ENV` - Set to `development` for local development
- `GEMINI_API_KEY` - For AI-powered summaries (if using Gemini integration)

### Firebase Configuration

The Firebase client config (API key, auth domain, project ID) is served from the backend so it isn’t hardcoded in the client.

#### Local (development)
Set `CLIENT_API_KEY`, `CLIENT_AUTH_DOMAIN`, and `CLIENT_PROJECT_ID` in your `functions/.env` file.

#### Option 2: Production (Secret Manager)
Production config lives in **Google Cloud Secret Manager** as the secret **`FUNCTIONS_CONFIG_EXPORT`** (one JSON object with all keys). To create or update it: run `firebase functions:config:export`, or in [Secret Manager](https://console.cloud.google.com/security/secret-manager) add a new version of that secret with JSON matching the shape in `functions/lib/exported-config.js` (e.g. `auth.client_api_key`, `github.access_token`, `spotify.client_id`, etc.).

## Monorepo

This repo is a **pnpm workspace** with two packages: `hosting` (React app) and `functions` (Firebase Cloud Functions). **[Turborepo](https://turbo.build/repo)** runs tasks across the workspace: it only runs a script in packages that define it, caches outputs, and avoids redundant work.

**Use the root for all commands.** Do not run `npm` or `pnpm install` inside `hosting/` or `functions/`; use `pnpm install` at the repo root once.

### Commands (from repo root)

| Command | What it does |
|--------|----------------|
| `pnpm install` | Install dependencies for root and all workspace packages (single lockfile: `pnpm-lock.yaml`). |
| `pnpm run build` | Build the hosting app (Vite → `hosting/dist`). Only the hosting package has a `build` script. |
| `pnpm run dev` | Start the hosting app’s Vite dev server (hot reload). Run with Functions + Auth emulators for a full local setup. |
| `pnpm run lint` | Lint the functions package (ESLint). |
| `pnpm run test` | Run functions unit tests (Vitest), single run. |
| `pnpm run test:coverage` | Run functions tests with coverage. |
| `pnpm run deploy:all` | Build hosting, then deploy everything (hosting + functions + Firestore rules, etc.) to Firebase. |
| `pnpm run deploy:hosting` | Build hosting, then deploy only Firebase Hosting. |
| `pnpm run deploy:functions` | Deploy only Cloud Functions (no build). |

**Note:** Use `pnpm run deploy:all` (with **run**). The bare `pnpm deploy` is pnpm’s own command and is not our Firebase deploy.

## Development

### Option A – Hosting app with hot reload (recommended)

Run the React app and proxy API calls to the emulated backend:

```bash
# Terminal 1: start Functions + Auth emulators
firebase emulators:start --only functions,auth

# Terminal 2: start the hosting app (from repo root)
pnpm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the Functions emulator. Sign-in and API testing work against the emulators.

### Option B – Full Firebase emulators (Hosting + Functions + Auth)

Build the hosting app once, then run all emulators so the site is served like production:

```bash
# From repo root: build the React app, then start emulators
pnpm run build
firebase emulators:start --only hosting,functions,auth
```

Open the Hosting URL (e.g. **http://metrics.dev-chrisvogt.me:8084**). Same rewrites as production: `/api/**` → Cloud Function, `**` → SPA.

### Emulator URLs

| Service   | URL                    |
|----------|------------------------|
| Emulator UI | http://127.0.0.1:4000 |
| Hosting  | http://127.0.0.1:8084 (or configured host) |
| Functions| http://127.0.0.1:5001 |
| Auth     | http://127.0.0.1:9099 |
| Firestore| http://127.0.0.1:8080 |

### Authentication System

The application includes a comprehensive authentication system with:

- **Email/Password Login**: Traditional email and password authentication
- **Phone Authentication**: SMS-based verification with Firebase Phone Auth
- **Google Sign-In**: OAuth authentication with Google accounts
- **Session Management**: Secure HTTP-only cookies with JWT fallback
- **Multi-tenant Support**: Ready for future multi-user expansion

### API Endpoints

The following endpoints are available:

| Widget | Description | Auth Required |
|--------|-------------|---------------|
| `/api/widgets/spotify` | GET Spotify widget content | No |
| `/api/widgets/sync/spotify` | Trigger Spotify data sync | Yes |
| `/api/widgets/steam` | GET Steam widget content | No |
| `/api/widgets/sync/steam` | Trigger Steam data sync | Yes |
| `/api/widgets/goodreads` | GET Goodreads widget content | No |
| `/api/widgets/sync/goodreads` | Trigger Goodreads data sync | Yes |
| `/api/widgets/instagram` | GET Instagram widget content | No |
| `/api/widgets/sync/instagram` | Trigger Instagram data sync | Yes |
| `/api/widgets/discogs` | GET Discogs widget content | No |
| `/api/widgets/sync/discogs` | Trigger Discogs data sync | Yes |
| `/api/widgets/flickr` | GET Flickr widget content | No |
| `/api/widgets/sync/flickr` | Trigger Flickr data sync | Yes |

### Authentication Endpoints

- `/api/auth/session` - Create session cookies (POST)
- `/api/firebase-config` - Get Firebase client configuration (GET)

## Architecture

### Frontend (hosting)
- **React + Vite** app in `hosting/`: sign-in (Google, email, phone) and API testing dashboard
- **Firebase SDK**: Client-side auth; config loaded at runtime from `/api/firebase-config`
- **Session**: Cookie-based sessions (created via `/api/auth/session`) with JWT fallback
- **Build**: From repo root, `pnpm run build` → `hosting/dist`; Firebase Hosting serves that folder and rewrites `/api/**` to the Cloud Function and `**` to `/index.html` (SPA)

See [hosting/README.md](hosting/README.md) for hosting-only scripts and local dev details.

### Backend (functions)
- **Firebase Functions**: Serverless backend with Express.js
- **Firebase Auth**: User authentication and session management
- **Firestore**: Data storage and caching
- **External APIs**: Integration with various platform APIs

### Security Features
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Built-in request throttling
- **Session Validation**: Secure session cookie validation
- **Environment Isolation**: Separate configs for development/production

## Testing

Tests live in `functions/`. From repo root:

```bash
pnpm run test              # run once
pnpm run test:coverage     # with coverage
```

For watch mode, run from the functions package: `pnpm --filter metrics-functions run test:watch`.

## Deployment

The hosting app must be **built** before deploy (the root `deploy:all` script does this automatically). All commands from repo root; see [Monorepo](#monorepo) for the full command list.

```bash
pnpm run build          # build hosting app only (output: hosting/dist)
pnpm run deploy:all     # build + deploy everything (hosting + functions + Firestore, etc.)
pnpm run deploy:hosting # build + deploy hosting only
pnpm run deploy:functions # deploy Cloud Functions only (no build)
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Install and set up (see [How to install](#how-to-install) and [Environment variables](#environment-variables))
4. Run tests: `pnpm run test` (from repo root)
5. Ensure the hosting app builds: `pnpm run build` (from repo root)
6. Commit your changes and open a Pull Request

## Copyright & License

Copyright © 2020-2025 [Chris Vogt](https://www.chrisvogt.me). Released under the [MIT License](LICENSE).
