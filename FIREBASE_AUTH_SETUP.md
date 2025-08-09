# Firebase Authentication Setup Guide

This guide will walk you through setting up Firebase Authentication with JWT tokens for your domain `*.chrisvogt.me`.

## Prerequisites

1. A Firebase project (you already have this)
2. Firebase CLI installed (`npm install -g firebase-tools`)
3. Domain verification for `*.chrisvogt.me`

## Step 1: Configure Firebase Authentication

### 1.1 Enable Google Sign-In

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** > **Sign-in method**
4. Enable **Google** as a sign-in provider
5. Add your authorized domain: `chrisvogt.me`
6. Configure the OAuth consent screen if needed

### 1.2 Configure Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Add the following domains:
   - `chrisvogt.me`
   - `api.chrisvogt.me`
   - `www.chrisvogt.me`
   - Any other subdomains you use

### 1.3 Set up OAuth Consent Screen (if not already done)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Configure the consent screen for your domain
5. Add `chrisvogt.me` as an authorized domain

## Step 2: Update Firebase Configuration

### 2.1 Get Your Firebase Config

1. In Firebase Console, go to **Project Settings** > **General**
2. Scroll down to **Your apps** section
3. If you don't have a web app, click **Add app** > **Web**
4. Copy the configuration object

### 2.2 Update the Config File

Edit `public/firebase-config.js` and replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

## Step 3: Deploy Your Functions

### 3.1 Deploy the Updated Functions

```bash
cd functions
npm run deploy
```

This will deploy your updated Cloud Functions with the new authentication middleware.

### 3.2 Deploy the Frontend

```bash
firebase deploy --only hosting
```

## Step 4: Test the Authentication

### 4.1 Test Login Flow

1. Visit your deployed site
2. Click "Login with Google"
3. You should be redirected to Google's OAuth consent screen
4. After successful authentication, you should see your user information
5. Check the browser's developer tools > Application > Local Storage to see the JWT token

### 4.2 Test Protected Endpoints

1. While logged in, try accessing a protected endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        https://your-project-id.cloudfunctions.net/app/api/user/profile
   ```

2. Test the sync endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        https://your-project-id.cloudfunctions.net/app/api/widgets/sync/spotify
   ```

## Step 5: Domain Configuration

### 5.1 Set up Custom Domain (Optional)

If you want to use a custom domain instead of the default Firebase hosting URL:

1. In Firebase Console, go to **Hosting**
2. Click **Add custom domain**
3. Add `api.chrisvogt.me` or your preferred subdomain
4. Follow the DNS configuration instructions

### 5.2 Update CORS Settings

The CORS configuration in your functions already includes `*.chrisvogt.me` patterns, so it should work with your domain.

## Step 6: Security Considerations

### 6.1 JWT Token Security

- JWT tokens are automatically stored in localStorage
- Tokens expire after 1 hour by default
- The authentication middleware validates tokens on every request
- Only users with `@chrisvogt.me` email addresses can access protected endpoints

### 6.2 Environment Variables

Make sure your Firebase service account token (`token.json`) is properly configured and secure.

## Troubleshooting

### Common Issues

1. **"Access denied" error**: Make sure your email ends with `@chrisvogt.me`
2. **CORS errors**: Check that your domain is in the CORS allowlist
3. **"No valid authorization header"**: Make sure you're sending the JWT token in the Authorization header
4. **Token expiration**: JWT tokens expire after 1 hour; the client will need to refresh them

### Debug Mode

To enable debug logging, add this to your browser console:

```javascript
localStorage.setItem('debug', 'firebase:*');
```

## API Endpoints

### Public Endpoints (No Authentication Required)
- `GET /api/widgets/{provider}` - Get widget data

### Protected Endpoints (Authentication Required)
- `GET /api/user/profile` - Get user profile information
- `GET /api/widgets/sync/{provider}` - Trigger data sync for a provider
- `POST /api/auth/logout` - Server-side logout

### Authentication Headers

For protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Next Steps

1. **Customize the UI**: Modify the HTML/CSS to match your site's design
2. **Add more providers**: Extend the authentication to support other providers (GitHub, etc.)
3. **Implement token refresh**: Add automatic token refresh logic
4. **Add user management**: Create admin interfaces for user management
5. **Monitor usage**: Set up Firebase Analytics to track authentication usage

## Support

If you encounter any issues:

1. Check the Firebase Console logs
2. Check the browser console for client-side errors
3. Verify your Firebase configuration
4. Ensure your domain is properly configured in Firebase
