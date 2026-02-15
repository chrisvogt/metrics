# Social Metrics API

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
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Firebase project** and `firebase login`

### Install steps

1. **Clone and install backend**
   ```bash
   git clone git@github.com:chrisvogt/metrics.git
   cd metrics
   cd functions
   npm install
   ```

2. **Install hosting app**
   ```bash
   cd ../hosting
   npm install
   ```

3. **Configure environment (local development)**  
   In `functions/`, copy the env template and set values (see [Environment variables](#environment-variables) below):
   ```bash
   cd functions
   cp .env.template .env
   # Edit .env (CLIENT_API_KEY, CLIENT_AUTH_DOMAIN, CLIENT_PROJECT_ID, etc.)
   ```

### Environment variables

For local development, copy the template and set your values:

```bash
# In the /functions directory
cp .env.template .env
# Edit .env with your actual values
```

**Important:** Never commit the `.env` file to version control. It contains sensitive information like API keys.

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

## Development

### Option A – Hosting app with hot reload (recommended)

Run the React app and proxy API calls to the emulated backend:

```bash
# Terminal 1: start Functions + Auth emulators
firebase emulators:start --only functions,auth

# Terminal 2: start the hosting app (from repo root)
cd hosting
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the Functions emulator. Sign-in and API testing work against the emulators.

### Option B – Full Firebase emulators (Hosting + Functions + Auth)

Build the hosting app once, then run all emulators so the site is served like production:

```bash
# From repo root: build the React app, then start emulators
npm run build
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
- **Build**: `npm run build` in `hosting/` (or root `npm run build`) → `hosting/dist`; Firebase Hosting serves that folder and rewrites `/api/**` to the Cloud Function and `**` to `/index.html` (SPA)

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

Tests live in `functions/`:

```bash
cd functions
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

## Deployment

The hosting app must be **built** before deploy (the root `deploy` script does this automatically).

```bash
# From repo root

# Build the hosting app (output: hosting/dist)
npm run build

# Deploy everything (build + hosting + functions + firestore rules, etc.)
npm run deploy

# Deploy only hosting (builds then deploys hosting)
npm run deploy:hosting

# Deploy only Cloud Functions (no hosting build)
npm run deploy:functions
```

**Note:** `npm run deploy` and `npm run deploy:hosting` run `npm run build` first, which does `cd hosting && npm ci && npm run build`. Ensure `hosting/package-lock.json` is committed so `npm ci` succeeds in CI or on other machines.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Install and set up (see [How to install](#how-to-install) and [Environment variables](#environment-variables))
4. Run tests: `cd functions && npm test`
5. Ensure the hosting app builds: `npm run build` (from repo root)
6. Commit your changes and open a Pull Request

## Copyright & License

Copyright © 2020-2025 [Chris Vogt](https://www.chrisvogt.me). Released under the [MIT License](LICENSE).
