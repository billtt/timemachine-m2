# CSRF Protection Implementation

This document describes the CSRF (Cross-Site Request Forgery) protection implementation for the TimeMachine application.

## Overview

The application implements CSRF protection using two different approaches:

1. **Double-Submit Cookie Pattern** (Primary)
2. **JWT-based CSRF Tokens** (Alternative)

## Implementation Details

### Double-Submit Cookie Pattern

The primary implementation uses the double-submit cookie pattern:

- A secret is stored in an httpOnly cookie
- A CSRF token is generated from the secret and sent to the client
- The client must include the token in requests via headers or form data
- The server verifies the token against the secret

### JWT-based CSRF Protection

An alternative implementation uses JWT tokens:

- Short-lived JWT tokens (1 hour) with type 'csrf'
- Tokens are stateless and self-contained
- No server-side storage required

## API Endpoints

### Get CSRF Token (Double-Submit)
```
GET /api/csrf-token
```

Response:
```json
{
  "success": true,
  "csrfToken": "token-value",
  "message": "CSRF token generated successfully"
}
```

### Get JWT CSRF Token
```
GET /api/csrf-token-jwt
```

Response:
```json
{
  "success": true,
  "csrfToken": "jwt-token-value",
  "message": "JWT CSRF token generated successfully"
}
```

## Client Usage

### Getting a CSRF Token

```javascript
// Get CSRF token
const response = await fetch('/api/csrf-token', {
  credentials: 'include' // Important for cookies
});
const { csrfToken } = await response.json();
```

### Making Protected Requests

Include the CSRF token in one of these ways:

1. **X-CSRF-Token header** (recommended):
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify(loginData)
});
```

2. **X-XSRF-Token header**:
```javascript
headers: {
  'X-XSRF-Token': csrfToken
}
```

3. **Form data**:
```javascript
const formData = new FormData();
formData.append('_csrf', csrfToken);
```

4. **Query parameter**:
```javascript
const url = `/api/slices?_csrf=${csrfToken}`;
```

## Protected Routes

CSRF protection is enabled on all state-changing operations:

### Authentication Routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

### Slice Routes
- `POST /api/slices`
- `PUT /api/slices/:id`
- `DELETE /api/slices/:id`

### Sync Routes
- `POST /api/sync`

## Error Responses

### Missing CSRF Token
```json
{
  "success": false,
  "error": "CSRF token missing or invalid",
  "code": "CSRF_TOKEN_MISSING"
}
```

### Invalid CSRF Token
```json
{
  "success": false,
  "error": "CSRF token invalid",
  "code": "CSRF_TOKEN_INVALID"
}
```

## Security Features

1. **httpOnly Cookies**: Secrets are stored in httpOnly cookies to prevent XSS attacks
2. **Secure Cookies**: In production, cookies use the `secure` flag
3. **SameSite Protection**: Cookies use `sameSite: 'strict'`
4. **Token Expiration**: JWT tokens expire after 1 hour
5. **Method Filtering**: Only POST, PUT, DELETE requests are protected

## Configuration

### Environment Variables

- `NODE_ENV`: Set to 'production' for secure cookies
- `JWT_SECRET`: Secret key for JWT token signing

### Cookie Settings

```javascript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
}
```

## CORS Integration

The CSRF implementation works with the existing CORS configuration:

```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true, // Required for cookies
  optionsSuccessStatus: 200
};
```

## Testing

To test CSRF protection:

1. Get a CSRF token from `/api/csrf-token`
2. Make a POST request without the token (should fail)
3. Make a POST request with the token (should succeed)
4. Try to reuse an expired token (should fail)

## Best Practices

1. Always fetch a new CSRF token when the page loads
2. Include `credentials: 'include'` in all fetch requests
3. Handle CSRF errors gracefully by refreshing the token
4. Use HTTPS in production for secure cookies
5. Set appropriate CORS origins for your frontend domains