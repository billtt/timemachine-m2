import { Router } from 'express';
import authRoutes from './auth';
import sliceRoutes from './slices';
import syncRoutes from './sync';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TimeMachine API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/slices', sliceRoutes);
router.use('/sync', syncRoutes);

export default router;