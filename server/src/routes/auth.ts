import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword 
} from '../controllers/authController';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { loginSchema, registerSchema } from '../types/validation';
import { z } from 'zod';

const router = Router();

// Public routes - CSRF protected
router.post('/register', csrfProtection(), validate(registerSchema), register);
router.post('/login', csrfProtection(), validate(loginSchema), login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', 
  authenticateToken, 
  csrfProtection(),
  validate(z.object({
    email: z.string().email().optional().or(z.literal(''))
  })), 
  updateProfile
);
router.put('/password', 
  authenticateToken, 
  csrfProtection(),
  validate(z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6)
  })), 
  changePassword
);

export default router;