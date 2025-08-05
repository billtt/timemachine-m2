# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TimeMachine v2.0 is a modern rewrite of a personal life tracking application. It's a full-stack TypeScript application with React frontend and Node.js backend, featuring PWA capabilities and offline support.

## Development Commands

### Setup and Installation
```bash
# Install all dependencies (root, server, client)
npm run install:all

# Clean install (removes all node_modules first)
npm run fresh-install

# Quick setup using the setup script
chmod +x setup.sh && ./setup.sh
```

### Development
```bash
# Start both server and client in development mode
npm run dev

# Start only server (port 5000)
npm run dev:server

# Start only client (port 3000)
npm run dev:client
```

### Testing
```bash
# Run all tests (server and client)
npm test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Run tests with coverage (client)
cd client && npm run test:coverage

# Run tests with UI (client)
cd client && npm run test:ui
```

### Building and Production
```bash
# Build both server and client
npm run build

# Start production server
npm start

# Preview client build
cd client && npm run preview
```

### Code Quality
```bash
# Lint all code
npm run lint

# Lint and fix all code
npm run lint:server && npm run lint:client

# Type checking
npm run typecheck
cd server && npm run typecheck
cd client && npm run typecheck
```

## Architecture

### Monorepo Structure
- **Root**: Contains orchestration scripts and shared dependencies
- **Server**: Node.js/Express backend with MongoDB
- **Client**: React/Vite frontend with PWA capabilities  
- **Shared**: Common TypeScript types used by both server and client

### Key Technologies
- **Backend**: Express, MongoDB/Mongoose, JWT authentication, TypeScript
- **Frontend**: React 18, Vite, Tailwind CSS, React Query, Zustand
- **PWA**: Service workers, offline storage with IndexedDB
- **Testing**: Jest (server), Vitest (client)

### Data Models
- **Users**: Authentication with bcrypt hashing, JWT tokens
- **Slices**: Life tracking entries with types (work, fun, gym, reading, other)
- **Sync**: Offline-first with background sync capabilities

### Authentication Flow
- JWT-based authentication with token storage in localStorage
- Automatic token injection via axios interceptors
- Auth error handling redirects to login page

### Offline Support
- IndexedDB for offline slice storage
- Background sync when connection restored
- Service worker caching for app shell

## Environment Setup

### Environment Files
- **Development**: `server/.env.dev` (automatically loaded when running `npm run dev`)
- **Production**: `server/.env.production` (loaded in production deployment)
- **Client**: `client/.env` (loaded by Vite in all modes)

### Development Environment Variables
Server (.env.dev):
```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/time
JWT_SECRET=dev-secret-key-change-in-production-super-long-secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000,http://192.168.50.236:3000,http://127.0.0.1:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=2000
```

Client (.env):
```
VITE_PWA_NAME=TimeMachine
VITE_PWA_SHORT_NAME=TimeMachine
VITE_PWA_DESCRIPTION=Personal life tracking app
VITE_DEV_TOOLS=true
```

### Production Environment Variables
Server (.env.production):
```
PORT=3003
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/time
JWT_SECRET=your-production-secret-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://time2.bill.tt
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=2000
```

### Database
- MongoDB with database name "time" (compatible with v1.0)
- **Backward Compatibility**: v2.0 maintains compatibility with v1.0 data structure
- **Authentication**: Supports both MD5 (v1.0) and bcrypt (v2.0) passwords with automatic upgrade
- **Slice References**: Uses username strings instead of ObjectIds for v1.0 compatibility
- Indexes optimized for user queries by time and type

## Development Notes

### File Organization
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data processing  
- **Models**: MongoDB schemas and validation
- **Middleware**: Authentication, validation, error handling
- **Types**: Shared TypeScript interfaces in `/shared/types.ts`

### State Management
- **Client**: Zustand for UI state, React Query for server state
- **Server**: Stateless with JWT authentication

### Testing Strategy
- **Server**: Jest with supertest for API testing
- **Client**: Vitest with React Testing Library
- **Coverage**: Configured for comprehensive test coverage

### PWA Features
- Installable on mobile devices
- Offline slice creation and viewing
- Background sync for pending data
- Service worker caching strategy

## Common Tasks

### Adding New Slice Types
1. Update `SliceType` in `/shared/types.ts`
2. Update `SLICE_TYPES` array in same file
3. Types are automatically validated in both client and server

### Database Migrations & Maintenance
- Run migration script: `cd server && npm run migrate`
- Fix unknown slice types: `cd server && npm run fix-slice-types`
- Inspect for problematic slices: `cd server && node src/scripts/inspectSlices.js`
- Fix slices with invalid content: `cd server && node src/scripts/fixSlices.js`
- Schema changes are handled via Mongoose model updates

### Debugging
- Server logs are structured with timestamp and request info
- Client errors are captured and displayed via toast notifications
- Check browser DevTools for PWA/service worker issues

## Production Deployment

### Server Configuration
- **Domain**: https://time2.bill.tt
- **Port**: 3003
- **Directory**: /data/time2
- **Process Manager**: PM2 (configured in ecosystem.config.js)

### Nginx Configuration
- Static files served directly from `/data/time2/client/dist`
- API routes (`/api/*`) proxied to Node.js backend on port 3003
- **Service Worker**: Special handling for `/sw.js` with no-cache headers
- **PWA Support**: Proper manifest.json and icon handling
- **Security**: HTTPS, security headers, rate limiting

### Deployment Process
```bash
# On server
cd /data/time2
git pull origin master
npm run build
pm2 restart time2
```

## Recent Bug Fixes & Improvements

### 1. Encryption Key Rotation Safety Measures
- **Issue**: Key rotation could cause data corruption if it fails midway, leaving slices encrypted with different keys
- **Risk**: Users could lose access to data if old key validation fails or process is interrupted
- **Fix**: 
  - **Safety Measure 1**: Old key validation - tests old password on 10 recent slices before proceeding
  - **Safety Measure 2**: Two-phase commit - uses temporary fields, then atomic MongoDB updates
  - **Automatic cleanup**: Removes temporary fields on any failure
- **Location**: `server/src/controllers/encryptionController.ts`

### 2. Rate Limiting Issues Fixed
- **Issue**: Users getting rate limit errors during normal usage
  - "Too many search requests. Please wait before searching again" (search-specific)
  - "Too many requests from this IP, please try again later" (general API)
- **Root Cause**: Rate limits were too restrictive for normal app usage patterns
- **Fix**: 
  - Removed search-specific rate limiting (was 10 searches/minute)
  - Increased general API rate limit from 100 to 2000 requests per 15 minutes
  - Added environment variables for customizable rate limiting
- **Location**: `server/src/routes/slices.ts`, `server/src/app.ts`

### 3. Encryption Timeout Issues
- **Issue**: Encryption password updates timeout when processing large datasets (many slices)
- **Error**: Request timeout after 10 seconds during key rotation with large slice counts
- **Fix**: 
  - Increased general API timeout from 10s to 30s
  - Set encryption key rotation timeout to 2 minutes (120s) on client
  - Added server-side timeout extension to 3 minutes for encryption operations
  - Enhanced error messages for encryption operation timeouts
- **Location**: `client/src/services/api.ts`, `server/src/routes/encryption.ts`

### 4. Unknown Slice Types Handling
- **Issue**: Production database contains slice types not in current code (e.g., 'sport')
- **Error**: `ValidatorError: 'sport' is not a valid enum value for path 'type'` during encryption key rotation
- **Fix**: 
  - Added 'sport' to valid slice types in `shared/types.ts`
  - Enhanced encryption controller to normalize unknown types to 'other'
  - Created migration script to fix existing data: `npm run fix-slice-types`
- **Location**: `shared/types.ts`, `server/src/controllers/encryptionController.ts`, `server/src/scripts/fix-slice-types.ts`

### 5. Duplicate Slice Prevention
- **Issue**: Network issues/idle sessions causing duplicate slice creation
- **Fix**: Added duplicate detection in SliceStore and form submission debouncing
- **Location**: `client/src/store/sliceStore.ts`, `client/src/components/SliceForm.tsx`

### 6. Cache Invalidation
- **Issue**: Slice cache not updating after Add/Edit/Delete operations
- **Fix**: Implemented proper React Query cache invalidation on CRUD operations
- **Location**: `client/src/store/sliceStore.ts`, `client/src/pages/HomePage.tsx`

### 7. Service Worker Issues
- **Issue**: `/sw.js` returning 404 in production
- **Root Cause**: Service worker was gitignored and nginx was caching it
- **Fix**: Updated .gitignore to allow manual service worker, added nginx no-cache config
- **Location**: `.gitignore`, `nginx.conf`

### 8. Environment Configuration
- **Issue**: Development needed separate environment config
- **Fix**: Added `.env.dev` support with automatic loading in development
- **Location**: `server/package.json`, `server/src/index.ts`

### 9. Password Migration
- **Issue**: v1.0 users couldn't login after deployment
- **Fix**: Implemented MD5 to bcrypt password upgrade system
- **Location**: `server/src/models/User.ts`, `server/src/controllers/authController.ts`

### 10. Database Compatibility
- **Issue**: v1.0 slices not loading due to user field mismatch
- **Fix**: Changed slice.user from ObjectId to username string
- **Location**: `server/src/models/Slice.ts`, `server/src/controllers/sliceController.ts`

### 11. Content Validation Error During Key Rotation
- **Issue**: Key rotation failing with "Path `content` is required" error on slices with null/empty content
- **Root Cause**: Database contained 3 legacy slices with missing or empty content fields from historical data
- **Fix**: 
  - Created database inspection script (`server/src/scripts/inspectSlices.js`) to identify problematic slices
  - Created repair script (`server/src/scripts/fixSlices.js`) to fix slices with missing/null/empty content
  - Added pre-rotation validation to detect and prevent processing of invalid slices
  - Enhanced error messages to guide users to run repair scripts
- **Prevention**: Pre-rotation validation now checks all slices before starting encryption process
- **Location**: `server/src/scripts/inspectSlices.js`, `server/src/scripts/fixSlices.js`, `server/src/controllers/encryptionController.ts`

### 12. Client Password Update on Server Failure
- **Issue**: When server-side password update fails, client still updates local password, creating inconsistency
- **Problem**: Local password is updated before server operation, leading to mismatched encryption keys
- **Fix**: 
  - Generate new encryption key without storing it locally first
  - Send server update request with old and new keys
  - Only update local password AFTER server operation succeeds
  - Enhanced error message to indicate local settings remain unchanged on failure
- **Prevention**: Ensures client-server encryption key consistency in all scenarios
- **Location**: `client/src/components/EncryptionSettings.tsx`

### 13. TempContent Undefined Error in Key Rotation
- **Issue**: `tempContent` field returning `undefined` during key rotation, causing validation errors
- **Root Cause**: Mongoose schema didn't include `tempContent` and `tempSearchTokens` fields, so `slice.set()` calls were ignored due to strict mode
- **Error**: "TempContent is invalid before save for slice [id]: undefined"
- **Fix**: 
  - Added `tempContent` and `tempSearchTokens` as optional fields to Slice schema
  - Fixed double decryption bug in search token generation (was decrypting already encrypted content)
  - Enhanced validation in encryption/decryption helper functions
  - Improved error messages with detailed debugging information
- **Prevention**: Schema now properly supports temporary fields needed for atomic operations
- **Location**: `server/src/models/Slice.ts`, `server/src/controllers/encryptionController.ts`

### 14. Data Corruption from Incorrect Key Validation (CRITICAL)
- **Issue**: When incorrect old key is provided, decryption fails but fallback logic causes data corruption
- **Problem**: `decryptContent` falls back to returning encrypted content when decryption fails, causing double encryption
- **Data Loss Risk**: All user slices get corrupted with double encryption and become unrecoverable
- **Error Pattern**: "Unsupported state or unable to authenticate data" for every slice, but operation continues
- **Fix**: 
  - Created `decryptContentStrict()` function that throws errors instead of falling back
  - Used strict decryption for key rotation validation and processing
  - Enhanced old key validation with proper error handling and reporting
  - Key rotation now fails fast on first decryption error instead of corrupting all data
- **Prevention**: Strict validation prevents any key rotation with incorrect old keys
- **Location**: `server/src/controllers/encryptionController.ts`

### 15. Content Exposure in Error Logs (Security)
- **Issue**: Server logs were displaying encrypted content and plaintext content in error messages during key rotation
- **Security Risk**: Sensitive user data (even if encrypted) should never appear in server logs
- **Fix**: 
  - Removed all `contentPreview`, `encryptedPreview`, and `value` logging from error messages
  - Replaced with safe metadata like content length, type, and isEmpty flags
  - Ensured no actual slice content is logged during validation or processing errors
  - Maintained useful debugging information without exposing sensitive data
- **Prevention**: Server logs now only contain metadata, never actual user content
- **Location**: `server/src/controllers/encryptionController.ts`

### 16. Encrypted Content Display Without Local Key (UX)
- **Issue**: When content is encrypted on server but no local key is set, client displays raw encrypted text instead of placeholder
- **Problem**: Inconsistent UX - should show same "🔒 [Incorrect Key]" message as when wrong key is set
- **User Experience**: Users see base64 encrypted strings instead of clear indication they need to set their encryption password
- **Fix**: 
  - Modified client decrypt logic to detect encrypted content even when no local key is set
  - Check if content looks like encrypted data (base64 + sufficient length) before checking for local key
  - Show "🔒 [Incorrect Key]" placeholder when encrypted content detected but no local key available
  - Maintain backward compatibility for actual plaintext content
- **Prevention**: Consistent encryption state display across all scenarios
- **Location**: `client/src/services/encryption.ts`

## Security Features

### CSRF Protection
- **Implementation**: Double-submit cookie pattern
- **Coverage**: All state-changing API requests
- **Location**: `server/src/middleware/csrf.ts`, `client/src/services/csrf.ts`

### Authentication Security
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcrypt with 12 rounds
- **Rate Limiting**: API endpoint protection
- **CORS**: Configured for production domain

### Input Validation
- **Server**: Zod schema validation
- **Client**: React Hook Form validation
- **XSS Prevention**: Content escaping and CSP headers
- **SQL Injection**: MongoDB parameterized queries

## Troubleshooting

### Common Issues

1. **Service Worker Not Loading**
   - Check nginx configuration for `/sw.js` no-cache headers
   - Verify `client/dist/sw.js` exists after build
   - Clear browser cache and service worker registration

2. **JWT Token Issues**
   - Verify JWT_SECRET is set in environment
   - Check token expiration (7 days default)
   - Ensure CORS headers allow credentials

3. **Database Connection**
   - Verify MongoDB is running on port 27017
   - Check MONGODB_URI in environment files
   - Ensure database name is "time" for v1.0 compatibility

4. **Build Issues**
   - Run `npm run typecheck` to check TypeScript errors
   - Ensure all dependencies are installed with `npm run install:all`
   - Check for missing environment variables

### Development Tips
- Use `npm run dev` for development with hot reload
- Check server logs for environment variable loading
- Use browser DevTools for PWA debugging
- Run tests with `npm test` before deployment

## Code Assistant Rules

### 1. File Creation Guidelines
- **DO NOT** create unnecessary documentation files (*.md) for fixes or instructions unless explicitly requested
- **DO NOT** create separate instruction files when the solution can be explained in the response
- **ONLY** create documentation files when user specifically asks for documentation

### 2. Build Verification
- **ALWAYS** run `npm run build` after modifying any TypeScript files or build scripts
- **MUST** fix any build errors before completing the task
- **TEST** type checking with `npm run typecheck` when changing TypeScript code
- **VERIFY** both client and server builds pass successfully