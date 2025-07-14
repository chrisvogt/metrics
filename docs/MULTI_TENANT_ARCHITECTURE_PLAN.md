# Multi-Tenant Architecture Plan for Metrics Project

## Current Architecture Analysis

The current setup is single-tenant with:
- Environment variables storing OAuth tokens and user IDs
- Fixed storage paths like `spotify/playlists/`
- Single Firestore collections per provider
- Scheduled functions that run for one user

## Multi-Tenant Architecture Changes

### 1. **Database Schema Changes**

You'd need to restructure your Firestore collections to be user-scoped:

**Current:**
```
/spotify/last-response_playlists
/spotify/last-response_top-tracks
```

**New:**
```
/users/{userId}/spotify/last-response_playlists
/users/{userId}/spotify/last-response_top-tracks
/users/{userId}/profile
/users/{userId}/oauth_tokens
```

### 2. **Storage Path Changes**

**Current:**
```
spotify/playlists/{id}.jpg
ig/{filename}
```

**New:**
```
{userId}/spotify/playlists/{id}.jpg
{userId}/instagram/{filename}
```

### 3. **Authentication & OAuth Flow**

You'd need to implement:
- Firebase Auth for user registration/login
- OAuth flows for each provider (Spotify, Instagram, etc.)
- Secure token storage in Firestore (encrypted)
- Token refresh mechanisms per user

### 4. **Function Architecture Changes**

**Current:** Single scheduled functions per provider
**New:** You'd need either:
- **Option A:** One scheduled function that iterates through all users
- **Option B:** Per-user scheduled functions (more complex)
- **Option C:** Manual trigger endpoints with user context

### 5. **Configuration Management**

Instead of environment variables, you'd need:
- User-specific OAuth tokens stored in Firestore
- User preferences/settings
- Provider connection status per user

## Key Questions to Consider

1. **Scheduling Strategy:** How do you want to handle the sync scheduling?
   - One function that processes all users sequentially?
   - Individual scheduled functions per user?
   - Manual triggers only?

2. **Rate Limiting:** How will you handle API rate limits when syncing multiple users?

3. **Error Handling:** How do you want to handle failures for individual users?

4. **Data Isolation:** Do you want complete isolation or any shared data?

5. **Billing:** How will you handle costs as you scale to multiple users?

## Implementation Phases

I'd suggest this approach:

### **Phase 1:** Database schema changes
- Create user collections structure
- Migrate existing data to user-scoped collections

### **Phase 2:** Authentication & OAuth
- Implement Firebase Auth
- Create OAuth flows for each provider
- Secure token storage

### **Phase 3:** Function refactoring
- Update sync functions to accept user context
- Implement user iteration logic
- Update storage paths

### **Phase 4:** Frontend changes
- User registration/login
- Provider connection UI
- User-specific dashboards

## Technical Considerations

### Security
- Encrypt OAuth tokens in Firestore
- Implement proper Firebase Auth rules
- Validate user permissions in functions

### Performance
- Consider batch operations for multiple users
- Implement proper indexing on user collections
- Monitor function execution times

### Scalability
- Plan for rate limiting across providers
- Consider queue systems for large user bases
- Monitor Firebase quotas and billing

### Data Migration
- Plan migration strategy for existing data
- Consider downtime requirements
- Test migration thoroughly

## Next Steps

1. Decide on scheduling strategy (Option A, B, or C)
2. Design detailed database schema
3. Plan OAuth flow implementation
4. Estimate development timeline
5. Consider MVP scope for initial multi-tenant release 