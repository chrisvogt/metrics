# Environment Setup for Firebase Functions

## Local Development

1. Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```
2. Fill in your actual values in the `.env` file.
3. The `.env` file is in `.gitignore` and is not committed.

When `NODE_ENV !== 'production'`, the app loads all config from `.env` (via dotenv). No other config files are used locally.

## Production

Production config is stored in **Google Cloud Secret Manager** as a single JSON secret:

- **Secret name:** `FUNCTIONS_CONFIG_EXPORT`
- **Location:** [Google Cloud Console → Secret Manager](https://console.cloud.google.com/security/secret-manager) (select your Firebase project).

The app binds this secret to the HTTP and scheduled functions and, on each cold start, reads the JSON and applies it to `process.env` using the mapping in `lib/exported-config.js`.

### Creating or updating the secret

**Option A: Export from existing Firebase config (one-time migration)**  
If you previously used `firebase functions:config:set`:

```bash
firebase functions:config:export
```

Follow the prompts; the CLI creates or updates the `FUNCTIONS_CONFIG_EXPORT` secret with your current runtime config.

**Option B: Edit in Secret Manager**  
1. Open Secret Manager in Cloud Console.  
2. Open the secret **FUNCTIONS_CONFIG_EXPORT**.  
3. **New version** → paste JSON that matches the shape expected by `lib/exported-config.js` (nested keys such as `github.access_token`, `spotify.client_id`, `auth.client_api_key`, etc.).  
4. Save. New function instances will use the latest version.

### Updating a single value

Edit **FUNCTIONS_CONFIG_EXPORT** in Secret Manager and add a new version with the full JSON (only the key you change needs a new value; the rest can be unchanged). Redeploy or wait for instances to recycle so they load the new version.

## Environment variables reference

See `.env.template` for the full list of variable names. The same names are used in `.env` (local) and as the target of the mapping from the secret’s JSON paths in `lib/exported-config.js` (production).

## After setup

- **Deploy:** `firebase deploy --only functions`
- **Local testing:** From repo root, `firebase emulators:start --only functions`, or `pnpm --filter personal-metrics run serve` (or from `functions/`, `pnpm run serve`)
