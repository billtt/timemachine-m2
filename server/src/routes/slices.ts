import { Router } from 'express';
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
import { 
  createSliceSchema, 
  updateSliceSchema, 
  sliceQuerySchema, 
  searchQuerySchema 
} from '../types/validation';

const router = Router();

// All slice routes require authentication
router.use(authenticateToken);

// Slice CRUD operations
router.post('/', validate(createSliceSchema), createSlice);
router.get('/', validateQuery(sliceQuerySchema), getSlices);
router.get('/stats', getSliceStats);
router.get('/search', validateQuery(searchQuerySchema), searchSlices);
router.get('/:id', getSlice);
router.put('/:id', validate(updateSliceSchema), updateSlice);
router.delete('/:id', deleteSlice);

export default router;