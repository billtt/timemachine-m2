import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, generateToken } from '../utils/jwt';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
  };
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
      return;
    }

    const decoded = verifyToken(token);
    
    // Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Add user info to request
    (req as AuthenticatedRequest).user = {
      id: decoded.userId,
      username: decoded.username
    };

    // Sliding-window renewal: reissue a fresh 7-day JWT on every
    // authenticated request and return it via a response header.
    // The client swaps its stored token in on the response interceptor.
    try {
      const renewed = generateToken(user);
      res.setHeader('X-Renewed-Token', renewed);
    } catch (err) {
      // Token renewal is best-effort — never block the request.
      console.warn('Failed to renew auth token:', err);
    }

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        (req as AuthenticatedRequest).user = {
          id: decoded.userId,
          username: decoded.username
        };
      }
    }
    
    next();
  } catch {
    // Optional auth doesn't fail, just continues without user
    next();
  }
};