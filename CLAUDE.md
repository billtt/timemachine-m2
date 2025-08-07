# CLAUDE.md

This file provides coding principles and guidelines for Claude Code when working with this repository.

## Coding Principles

### 1. Problem Investigation
When a problem is reported with suggested causes, use the provided cause as a clue to investigate and find the complete root cause. Do not accept surface-level explanations - dig deeper to understand the full context and identify all contributing factors.

### 2. File Creation Guidelines
- **DO NOT** create unnecessary documentation files (*.md) unless explicitly requested
- **DO NOT** create separate instruction files when the solution can be explained in the response
- **ONLY** create documentation files when user specifically asks for documentation
- **ALWAYS** prefer editing existing files over creating new ones

### 3. Build Verification
- **ALWAYS** run `npm run build` after modifying TypeScript files or build scripts
- **MUST** fix any build errors before completing the task
- **TEST** type checking with `npm run typecheck` when changing TypeScript code
- **VERIFY** both client and server builds pass successfully

### 4. Code Quality Standards
- Follow existing code conventions and patterns in the codebase
- Use TypeScript strictly - leverage type safety
- Maintain consistency with existing error handling patterns
- Write secure code - never expose sensitive data in logs or error messages
- Implement proper validation for all user inputs

### 5. Security Guidelines
- Never log actual user content or sensitive data in server logs
- Use metadata and safe identifiers for debugging instead of actual content
- Validate all encryption keys before processing operations
- Ensure client-server state consistency for encryption
- Clear all user-specific data on logout for security isolation

## Architecture Principles

### State Management
- **Client**: Zustand for UI state, React Query for server state
- **Server**: Stateless with JWT authentication
- Maintain consistency between local and server state

### Error Handling
- Client errors should be user-friendly with toast notifications
- Server errors should be detailed for debugging but not expose sensitive data
- Implement proper validation at both client and server levels
- Use TypeScript for compile-time error prevention

### Data Consistency
- Implement atomic operations for critical data changes
- Use two-phase commit patterns for complex operations
- Validate data integrity before and after operations
- Maintain backward compatibility with existing data

### Testing Strategy
- **Server**: Jest with supertest for API testing
- **Client**: Vitest with React Testing Library
- Write tests that cover edge cases and error scenarios
- Maintain test coverage for critical functionality

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm run install:all

# Development mode
npm run dev

# Build verification
npm run build

# Type checking
npm run typecheck

# Run tests
npm test

# Code quality
npm run lint
```

## Key Technologies & Patterns

### Backend Stack
- Express with TypeScript
- MongoDB with Mongoose
- JWT authentication with bcrypt hashing
- Structured logging with metadata

### Frontend Stack
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS for styling
- React Query for server state
- Zustand for client state

### Encryption Architecture
- AES-GCM encryption with Web Crypto API
- Client-side key derivation from passwords
- Bigram-based search token generation
- Consistent state validation between client and server

### PWA Features
- Service worker with offline support
- IndexedDB for offline storage
- Background sync for pending operations
- Proper cache management and invalidation

## Critical Implementation Notes

### Encryption Key Management
- Always validate old keys before rotation
- Use strict decryption to prevent data corruption
- Implement atomic updates with temporary fields
- Ensure client-server encryption state consistency

### Data Migration Safety
- Validate data integrity before processing
- Create inspection and repair scripts for problematic data
- Use two-phase commits for critical operations
- Implement proper rollback mechanisms

### Performance Considerations
- Optimize MongoDB queries with proper indexing
- Implement efficient cache invalidation strategies
- Use background sync for offline operations
- Minimize client-server round trips

### Security Implementation
- Rate limiting with configurable thresholds
- CSRF protection with double-submit cookies
- Proper CORS configuration for production
- Input validation with Zod schemas
- Content Security Policy headers

## Database Design

### Backward Compatibility
- Maintain v1.0 compatibility with username-based slice references
- Support both MD5 and bcrypt password hashing
- Handle unknown slice types gracefully
- Provide migration scripts for data cleanup

### Optimization
- Database name: "time" (for v1.0 compatibility)
- Indexes optimized for user queries by time and type
- Efficient aggregation queries for analytics
- Proper schema validation with Mongoose

## File Organization Patterns

### Server Structure
- **Controllers**: HTTP request handling
- **Services**: Business logic implementation
- **Models**: MongoDB schemas and validation
- **Middleware**: Authentication, validation, error handling
- **Scripts**: Database maintenance and migration tools

### Client Structure
- **Components**: Reusable UI components
- **Pages**: Route-level components
- **Store**: State management with Zustand
- **Services**: API communication and encryption
- **Utils**: Helper functions and utilities

### Shared Resources
- **Types**: Common TypeScript interfaces
- **Constants**: Shared constants and messages
- Maintain single source of truth for shared code