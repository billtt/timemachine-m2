import { Router } from 'express';
import authRoutes from './auth';
import sliceRoutes from './slices';
import syncRoutes from './sync';
import adminRoutes from './admin';
import { generateCSRFToken, generateJWTCSRFToken } from '../middleware/csrf';

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

// CSRF token endpoints
router.get('/csrf-token', (req, res) => {
  const { token } = generateCSRFToken(req, res);
  
  res.json({
    success: true,
    csrfToken: token,
    message: 'CSRF token generated successfully'
  });
});

// Alternative JWT-based CSRF token endpoint
router.get('/csrf-token-jwt', (req, res) => {
  const token = generateJWTCSRFToken();
  
  res.json({
    success: true,
    csrfToken: token,
    message: 'JWT CSRF token generated successfully'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/slices', sliceRoutes);
router.use('/sync', syncRoutes);

// Admin routes (in production, add authentication middleware)
router.use('/admin', adminRoutes);

export default router;