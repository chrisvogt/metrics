# Environment Setup for Firebase Functions v2

## Local Development

1. Copy `env.template` to `.env`:
   ```bash
   cp env.template .env
   ```
2. Fill in your actual values in the `.env` file
3. The `.env` file is already in `.gitignore` so it won't be committed

## Production Deployment

### Option 1: Use the setup script
```bash
node scripts/setup-env-vars.js
```

### Option 2: Manual setup
Set each environment variable using Firebase CLI:
```bash
firebase functions:config:set storage.firestore_database_url="your_value"
firebase functions:config:set storage.cloud_storage_images_bucket="your_value"
# ... continue for all variables
```

### Option 3: Firebase Console
1. Go to Firebase Console → Functions → Configuration
2. Add environment variables under "Environment variables" section

## Environment Variables Needed

See `env.template` for the complete list of required environment variables.

## After Setup

1. Deploy your functions: `firebase deploy --only functions`
2. You can safely delete `.runtimeconfig.json` if you want
3. For local testing: `firebase emulators:start --only functions` 