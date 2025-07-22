# Changelog

## 0.16.0

- **FEATURE**: Added AI-powered music summary to Spotify widget using Google Gemini
- Spotify widget now includes intelligent 2-3 paragraph summaries of listening activity and musical preferences
- AI analyzes top tracks, artists, playlists, and identifies genre patterns and listening habits
- Enhanced Spotify sync job to generate and store AI summaries separately for widget consumption
- Comprehensive prompt includes track popularity scores, playlist metadata, and profile information
- Added comprehensive test coverage for new AI summary functionality
- Graceful fallback handling when AI summary generation fails - sync continues without interruption
- AI summaries are cached separately and can be regenerated independently of music data

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
