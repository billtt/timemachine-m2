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

### Required Environment Variables
Server (.env):
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/time
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
```

Client (.env - optional):
```
VITE_API_URL=http://localhost:5000/api
```

### Database
- MongoDB with database name "time" (compatible with v1.0)
- Automatic schema migration from existing v1.0 data
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