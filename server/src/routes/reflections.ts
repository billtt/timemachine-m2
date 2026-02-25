import { Router } from 'express';
import { getReflection, upsertReflection } from '../controllers/reflectionController';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = Router();

// All reflection routes require authentication
router.use(authenticateToken);

router.get('/', getReflection);
router.post('/', csrfProtection(), upsertReflection);

export default router;
