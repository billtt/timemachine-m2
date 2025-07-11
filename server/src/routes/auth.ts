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
import { loginSchema, registerSchema } from '../types/validation';
import { z } from 'zod';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', 
  authenticateToken, 
  validate(z.object({
    email: z.string().email().optional().or(z.literal(''))
  })), 
  updateProfile
);
router.put('/password', 
  authenticateToken, 
  validate(z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6)
  })), 
  changePassword
);

export default router;