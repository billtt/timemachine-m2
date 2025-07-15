import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { LoginData, RegisterData } from '../types/validation';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, password, email }: RegisterData = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ name: username });
  if (existingUser) {
    throw createError('Username already exists', 400);
  }

  // Create new user
  const user = new User({
    name: username,
    password,
    email: email || undefined
  });

  await user.save();

  // Generate token
  const token = generateToken(user);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    },
    message: 'User registered successfully'
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password }: LoginData = req.body;

  console.log('Login attempt for user:', username);
  console.log('Password provided:', password ? '[PROVIDED]' : '[MISSING]');

  // Find user and include both password and key fields for comparison
  const user = await User.findOne({ name: username }).select('+password +key');
  if (!user) {
    console.log('User not found:', username);
    throw createError('Invalid credentials', 401);
  }

  console.log('User found:', {
    id: user._id,
    name: user.name,
    hasPassword: !!user.password,
    passwordLength: user.password ? user.password.length : 0,
    hasKey: !!user.key,
    keyLength: user.key ? user.key.length : 0
  });

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    console.log('Password validation failed for user:', username);
    throw createError('Invalid credentials', 401);
  }

  // Security: Log if user was using legacy password format
  if (user.key && !user.password) {
    console.warn(`SECURITY: User ${username} was using legacy MD5 password format - now upgraded to bcrypt`);
  }

  // Generate token
  const token = generateToken(user);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    },
    message: 'Login successful'
  });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  
  const user = await User.findById(req.user.id);
  if (!user) {
    throw createError('User not found', 404);
  }

  if (email !== undefined) {
    user.email = email;
  }

  await user.save();

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    },
    message: 'Profile updated successfully'
  });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password +key');
  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw createError('Current password is incorrect', 400);
  }

  // Update password and clear legacy key field
  user.password = newPassword;
  user.key = null; // Clear legacy field
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});