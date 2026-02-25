import { Response } from 'express';
import { Reflection } from '../models/Reflection';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export const getReflection = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { date } = req.query as { date: string };

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError('Invalid date format. Expected yyyy-MM-dd', 400);
  }

  const reflection = await Reflection.findOne({
    user: req.user.username,
    date
  });

  res.json({
    success: true,
    data: { reflection: reflection ? reflection.toJSON() : null }
  });
});

export const upsertReflection = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { date, questions } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError('Invalid date format. Expected yyyy-MM-dd', 400);
  }

  if (!Array.isArray(questions)) {
    throw createError('questions must be an array', 400);
  }

  const reflection = await Reflection.findOneAndUpdate(
    { user: req.user.username, date },
    { user: req.user.username, date, questions },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: { reflection: reflection.toJSON() },
    message: 'Reflection saved successfully'
  });
});
