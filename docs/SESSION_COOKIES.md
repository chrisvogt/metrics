# Session Cookies Implementation

## Overview

This project now supports Firebase session cookies as a more secure alternative to storing JWT tokens in localStorage. Session cookies provide better security against XSS attacks and are automatically sent with requests to your domain.

## How It Works

### 1. Authentication Flow

1. **User Login**: When a user logs in with Firebase Auth, a JWT token is obtained
2. **Session Creation**: The JWT token is sent to `/api/auth/session` to create a secure session cookie
3. **Cookie Storage**: A secure HTTP-only cookie is set with the session data
4. **API Requests**: Subsequent requests automatically include the session cookie

### 2. Security Features

- **HTTP-Only**: Cookies cannot be accessed by JavaScript (prevents XSS attacks)
- **Secure**: Cookies are only sent over HTTPS in production
- **SameSite**: Set to 'strict' for CSRF protection
- **Expiration**: Session cookies expire after 5 days
- **Domain Restriction**: Only valid for your domain

### 3. Fallback Mechanism

The system supports both authentication methods:
- **Primary**: Session cookies (more secure)
- **Fallback**: JWT tokens in Authorization header (for compatibility)

## API Endpoints

### Create Session Cookie
```
POST /api/auth/session
Authorization: Bearer <jwt-token>
```

Creates a secure session cookie from a valid JWT token.

### Logout
```
POST /api/auth/logout
```

Revokes refresh tokens and clears the session cookie.

## Client-Side Usage

### API Client Methods

```javascript
// Create session cookie from JWT token
await apiClient.createSession(jwtToken);

// Clear session cookie
apiClient.clearSession();

// List all cookies (for debugging)
const cookies = apiClient.listAllCookies();
```

### Automatic Session Creation

The main application automatically creates session cookies when users log in:

```javascript
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const token = await user.getIdToken();
    await apiClient.createSession(token);
  } else {
    apiClient.clearSession();
  }
});
```

## Testing

Use the session test page to verify functionality:
- Navigate to `/session-test.html`
- Login with your Google account
- Test session cookie creation and API calls
- View cookie information

## Benefits

1. **Enhanced Security**: HTTP-only cookies prevent XSS attacks
2. **Automatic Handling**: Cookies are automatically sent with requests
3. **Better UX**: No need to manually manage tokens
4. **CSRF Protection**: SameSite attribute prevents cross-site attacks
5. **Compliance**: Meets security best practices for web applications

## Migration

The implementation is backward compatible:
- Existing JWT token authentication still works
- New session cookie authentication is preferred
- Gradual migration is possible

## Configuration

Session cookies are configured with the following settings:
- **Expiration**: 5 days
- **HTTP-Only**: true
- **Secure**: true (in production)
- **SameSite**: strict
- **Path**: /

These settings can be modified in the `/api/auth/session` endpoint.
