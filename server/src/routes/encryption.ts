import express from 'express';
import { rotateEncryptionKey } from '../controllers/encryptionController';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = express.Router();

// Apply authentication to all encryption routes
router.use(authenticateToken);

// Note: Debug logging removed for security - encryption routes handle sensitive data

// Middleware to extend timeout for long-running encryption operations
const extendTimeout = (req: any, res: any, next: any) => {
  // Set timeout to 3 minutes for encryption operations (can process many slices)
  req.setTimeout(180000); // 3 minutes
  res.setTimeout(180000); // 3 minutes
  next();
};

// Key rotation endpoint (protected with CSRF and extended timeout)
router.post('/rotate-key', extendTimeout, csrfProtection(), rotateEncryptionKey as any);

export default router;