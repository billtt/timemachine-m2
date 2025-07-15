import { Request, Response, NextFunction } from 'express';
import Tokens = require('csrf');
import { sign, verify } from 'jsonwebtoken';

// Create CSRF token handler
const tokens = new Tokens();

// Types for CSRF
interface CSRFRequest extends Request {
  csrfToken?: string;
  csrfSecret?: string;
}

// Generate a secret for CSRF token generation
const generateSecret = (): string => {
  return tokens.secretSync();
};

// Create CSRF token from secret
const createToken = (secret: string): string => {
  return tokens.create(secret);
};

// Verify CSRF token against secret
const verifyToken = (secret: string, token: string): boolean => {
  return tokens.verify(secret, token);
};

// Double-submit cookie pattern implementation
export const csrfProtection = () => {
  return (req: CSRFRequest, res: Response, next: NextFunction) => {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Get token from headers or body
    const token = req.headers['x-csrf-token'] || 
                  req.headers['x-xsrf-token'] || 
                  req.body._csrf || 
                  req.query._csrf;

    // Get secret from cookie (using cookie-parser)
    const secret = (req as any).cookies?.['csrf-secret'];

    if (!token || !secret) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token missing or invalid',
        code: 'CSRF_TOKEN_MISSING'
      });
    }

    // Verify token against secret
    if (!verifyToken(secret, token as string)) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token invalid',
        code: 'CSRF_TOKEN_INVALID'
      });
    }

    next();
  };
};

// Generate CSRF token and secret
export const generateCSRFToken = (req: Request, res: Response) => {
  const secret = generateSecret();
  const token = createToken(secret);
  
  // Set secret in httpOnly cookie
  res.cookie('csrf-secret', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });

  return {
    token,
    secret
  };
};

// Alternative JWT-based CSRF implementation
export const jwtCSRFProtection = () => {
  const secret = process.env.JWT_SECRET || 'your-jwt-secret';
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Get token from headers or body
    const token = req.headers['x-csrf-token'] || 
                  req.headers['x-xsrf-token'] || 
                  req.body._csrf || 
                  req.query._csrf;

    if (!token) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING'
      });
    }

    try {
      // Verify JWT token
      const decoded = verify(token as string, secret) as any;
      
      // Check if token is specifically for CSRF
      if (decoded.type !== 'csrf') {
        throw new Error('Invalid token type');
      }

      // Check if token is expired (tokens should be short-lived)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp < now) {
        throw new Error('Token expired');
      }

      next();
    } catch {
      return res.status(403).json({
        success: false,
        error: 'CSRF token invalid',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
  };
};

// Generate JWT-based CSRF token
export const generateJWTCSRFToken = () => {
  const secret = process.env.JWT_SECRET || 'your-jwt-secret';
  
  const token = sign(
    {
      type: 'csrf',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    },
    secret
  );

  return token;
};