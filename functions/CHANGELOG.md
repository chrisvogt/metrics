# Changelog

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
