import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  createSlice, 
  getSlices, 
  getSlice, 
  updateSlice, 
  deleteSlice, 
  searchSlices, 
  getSliceStats 
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

// Specific rate limit for search operations to prevent abuse
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 search requests per minute
  message: {
    success: false,
    error: 'Too many search requests. Please wait before searching again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Slice CRUD operations
router.post('/', csrfProtection(), validate(createSliceSchema), createSlice);
router.get('/', validateQuery(sliceQuerySchema), getSlices);
router.get('/stats', getSliceStats);
router.get('/search', searchRateLimit, validateQuery(searchQuerySchema), searchSlices);
router.get('/:id', getSlice);
router.put('/:id', csrfProtection(), validate(updateSliceSchema), updateSlice);
router.delete('/:id', csrfProtection(), deleteSlice);

export default router;