import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  createSlice, 
  getSlices, 
  getSlice, 
  updateSlice, 
  deleteSlice, 
  searchSlices, 
  getSliceStats,
  getSliceContents
} from '../controllers/sliceController';
import { validate, validateQuery } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { 
  createSliceSchema, 
  updateSliceSchema, 
  sliceQuerySchema, 
  searchQuerySchema 
} from '../types/validation';

const router = Router();

// All slice routes require authentication
router.use(authenticateToken);

// Note: Search rate limiting removed to allow unlimited searches for better UX

// Slice CRUD operations
router.post('/', csrfProtection(), validate(createSliceSchema), createSlice);
router.get('/', validateQuery(sliceQuerySchema), getSlices);
// Specific routes must come before parameterized routes
router.get('/contents', getSliceContents);  // Content-only endpoint for validation
router.get('/stats', getSliceStats);
router.get('/search', validateQuery(searchQuerySchema), searchSlices);
// Parameterized routes come last
router.get('/:id', getSlice);
router.put('/:id', csrfProtection(), validate(updateSliceSchema), updateSlice);
router.delete('/:id', csrfProtection(), deleteSlice);

export default router;