import express from 'express';
import { rotateEncryptionKey } from '../controllers/encryptionController';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = express.Router();

// Apply authentication to all encryption routes
router.use(authenticateToken);

// Note: Debug logging removed for security - encryption routes handle sensitive data

// Key rotation endpoint (protected with CSRF)
router.post('/rotate-key', csrfProtection(), rotateEncryptionKey as any);

export default router;