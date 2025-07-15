import { Router } from 'express';
import { syncSlices, getLastSyncTime, getSlicesSince } from '../controllers/syncController';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { syncSchema } from '../types/validation';

const router = Router();

// All sync routes require authentication
router.use(authenticateToken);

// Sync endpoints
router.post('/', csrfProtection(), validate(syncSchema), syncSlices);
router.get('/last-sync', getLastSyncTime);
router.get('/since', getSlicesSince);

export default router;