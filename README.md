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

## How To Install

### Prerequisites

- Node.js (version specified in [.nvmrc](./.nvmrc))
- Firebase CLI
- Access to a Firebase project

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone git@github.com:chrisvogt/metrics.git
   cd metrics
   ```

2. **Install Firebase CLI and authenticate**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. **Install dependencies**
   ```bash
   cd functions
   npm install
   ```

4. **Set up environment variables**
   ```bash
   # Copy the template file
   cp env.template .env
   
   # Edit .env with your actual values
   # See Environment Variables section below
   ```

5. **Download Firebase configuration**
   ```bash
   # Download runtime config (includes secrets for sync jobs)
   firebase functions:config:get > .runtimeconfig.json
   ```

### Environment Variables

For local development, you'll need to set up environment variables. Copy the template file and fill in your values:

```bash
# In the /functions directory
cp env.template .env
# Edit .env with your actual Firebase configuration
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

The Firebase configuration is now served dynamically from the backend to prevent hardcoding sensitive values in the client. You can set these values using either method:

#### Option 1: Local .env file (for development)
Set these environment variables in your `functions/.env` file:

- `CLIENT_API_KEY` - Your Firebase API key
- `CLIENT_AUTH_DOMAIN` - Your Firebase auth domain
- `CLIENT_PROJECT_ID` - Your Firebase project ID

#### Option 2: Firebase Runtime Config (recommended for production)
Use Firebase's runtime configuration system:

```bash
firebase functions:config:set auth.client_api_key="your_api_key"
firebase functions:config:set auth.client_auth_domain="your_project_id.firebaseapp.com"
firebase functions:config:set auth.client_project_id="your_project_id"
```

Then download the config: `firebase functions:config:get > .runtimeconfig.json`

## Development

### Starting the Local Development Server

```bash
# Start Firebase emulators (Auth, Firestore, Functions, Hosting)
firebase emulators:start

# Or start just the functions emulator
cd functions
npm run serve
```

The emulators will be available at:
- **Emulator UI**: http://127.0.0.1:4000/
- **Hosting**: http://127.0.0.1:8084
- **Functions**: http://127.0.0.1:5001
- **Auth**: http://127.0.0.1:9099
- **Firestore**: http://127.0.0.1:8080

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

### Frontend
- **HTML/CSS/JavaScript**: Modern, responsive UI with authentication tabs
- **Firebase SDK**: Client-side authentication and real-time updates
- **Session Management**: Secure cookie-based sessions with fallback

### Backend
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

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

```bash
# Deploy to Firebase
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Copyright & License

Copyright © 2020-2025 [Chris Vogt](https://www.chrisvogt.me). Released under the [MIT License](LICENSE).
