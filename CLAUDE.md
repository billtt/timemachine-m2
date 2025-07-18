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

### Database Migrations
- Run migration script: `cd server && npm run migrate`
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

### 1. Duplicate Slice Prevention
- **Issue**: Network issues/idle sessions causing duplicate slice creation
- **Fix**: Added duplicate detection in SliceStore and form submission debouncing
- **Location**: `client/src/store/sliceStore.ts`, `client/src/components/SliceForm.tsx`

### 2. Cache Invalidation
- **Issue**: Slice cache not updating after Add/Edit/Delete operations
- **Fix**: Implemented proper React Query cache invalidation on CRUD operations
- **Location**: `client/src/store/sliceStore.ts`, `client/src/pages/HomePage.tsx`

### 3. Service Worker Issues
- **Issue**: `/sw.js` returning 404 in production
- **Root Cause**: Service worker was gitignored and nginx was caching it
- **Fix**: Updated .gitignore to allow manual service worker, added nginx no-cache config
- **Location**: `.gitignore`, `nginx.conf`

### 4. Environment Configuration
- **Issue**: Development needed separate environment config
- **Fix**: Added `.env.dev` support with automatic loading in development
- **Location**: `server/package.json`, `server/src/index.ts`

### 5. Password Migration
- **Issue**: v1.0 users couldn't login after deployment
- **Fix**: Implemented MD5 to bcrypt password upgrade system
- **Location**: `server/src/models/User.ts`, `server/src/controllers/authController.ts`

### 6. Database Compatibility
- **Issue**: v1.0 slices not loading due to user field mismatch
- **Fix**: Changed slice.user from ObjectId to username string
- **Location**: `server/src/models/Slice.ts`, `server/src/controllers/sliceController.ts`

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