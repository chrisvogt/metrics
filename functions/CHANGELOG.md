# Changelog

## 0.17.0

- **FEATURE**: Added comprehensive Firebase Authentication system with secure session management
- **BREAKING CHANGE**: Sync endpoints now require authentication (JWT token or session cookie)
- New Firebase Auth integration with user creation/deletion triggers for automatic database management
- Added secure session cookie support as primary authentication method (HTTP-only, secure, SameSite)
- Implemented rate limiting middleware to prevent API abuse (10 sync requests per 15 minutes)
- Added domain-based access control restricting access to @chrisvogt.me and @chronogrove.com users only
- New protected endpoints: `/api/user/profile`, `/api/auth/session`, `/api/auth/logout`
- Enhanced security with automatic token verification and refresh token management
- Added comprehensive test coverage for all authentication flows (100% code coverage)
- Updated CORS configuration to support credentials for cross-origin cookie handling
- Added Firebase emulator support for development and testing environments
- New user management jobs for automatic database synchronization with Firebase Auth
- Enhanced logging and error handling throughout authentication system

## 0.16.0

- **FEATURE**: Added comprehensive Discogs integration for vinyl record collection tracking
- New Discogs API integration to fetch user's vinyl record collection and releases
- Added Discogs sync job to periodically update collection data from Discogs API
- Created Discogs widget content function to serve collection data to frontend
- Added data transformers for Discogs releases and destination path handling
- Comprehensive test coverage for all Discogs functionality (100% code coverage)
- Added Discogs API configuration and environment variables
- Integration follows existing multi-tenant architecture patterns

## 0.15.0

- **FEATURE**: Added AI-powered reading summary to Goodreads widget using Google Gemini
- Goodreads widget now includes intelligent 2-3 paragraph summaries of reading activity and patterns
- AI analyzes recent books, identifies genre preferences, and highlights standout reads
- Enhanced Goodreads sync job to generate and store AI summaries separately for widget consumption
- Increased Goodreads API fetch limit from 18 to 100 books for better reading pattern analysis
- Added comprehensive test coverage for new AI summary functionality (100% code coverage)
- Graceful fallback handling when AI summary generation fails - sync continues without interruption
- AI summaries are cached separately and can be regenerated independently of book data

## 0.14.0

- **FEATURE**: Added multi-tenant support for Instagram widget
- Instagram widget now supports dynamic user-based collection names (`users/{userId}/instagram`)
- Added hostname-based user detection in API endpoints (chronogrove.com → chronogrove, others → chrisvogt)
- Updated Instagram widget tests with comprehensive coverage (100% code coverage)
- Fixed linter warnings and improved error handling in Instagram widget
- Temporary solution for multi-tenant support while maintaining backward compatibility

## 0.13.0

- **BREAKING CHANGE**: Migrates database structure to user-scoped collections for multi-tenant support
- All database collections now use `users/chrisvogt/` prefix (e.g., `users/chrisvogt/spotify/widget-content`)
- Storage paths updated to be user-scoped (e.g., `chrisvogt/spotify/playlists/`)
- Added `CURRENT_USERNAME` constant for future multi-tenant configuration
- Updated all sync jobs and widget content functions to use new user-scoped paths
- No data loss - existing data remains in old collections while new data uses user-scoped structure
- Foundation ready for Firebase Auth and OAuth integration for multiple users

## 0.12.0

- Uses Gemini via Firebase to add a new AI summary to the Steam widget content.

## 0.11.2 — 0.11.5

- Package dependency updates.

## 0.11.1

- Disables all sync/* endpoints for security. They can be added back once auth is implemented.

## 0.11.0

- Update package from CommonJS to ESM.

## 0.10.1

- Continue improving code coverage.

## 0.10.0

- Adds vitest and the first unit test spec file.

## 0.9.1

- Fix Steam icon URL to use https instead of http.

## 0.9.0

- Adds "ownedGame" to the Steam widget API response.

## 0.8.0

- Fetches additional fields from the Instagram API: biography, followersCount.
- Adds additional response information to the Instagram sync API response when no images were uploaded.
- Adds this changelog.

----

This changelog was started with v0.8.0.
