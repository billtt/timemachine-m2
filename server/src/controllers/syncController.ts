import { Response } from 'express';
import { Slice } from '../models/Slice';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { SyncData } from '../types/validation';

export const syncSlices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { slices: incomingSlices }: SyncData = req.body;

  const synced: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  // Process each slice
  for (const incomingSlice of incomingSlices) {
    try {
      // Check if slice already exists (in case of duplicate sync)
      const existingSlice = await Slice.findOne({
        user: req.user.id,
        content: incomingSlice.content,
        time: new Date(incomingSlice.time),
        type: incomingSlice.type
      });

      if (existingSlice) {
        // Slice already exists, mark as synced
        synced.push(incomingSlice.id);
        continue;
      }

      // Create new slice
      const slice = new Slice({
        content: incomingSlice.content,
        type: incomingSlice.type,
        time: new Date(incomingSlice.time),
        user: req.user.id
      });

      await slice.save();
      synced.push(incomingSlice.id);
    } catch (error) {
      failed.push({
        id: incomingSlice.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  res.json({
    success: true,
    data: {
      synced,
      failed,
      total: incomingSlices.length,
      successCount: synced.length,
      failedCount: failed.length
    },
    message: `Sync completed: ${synced.length} successful, ${failed.length} failed`
  });
});

export const getLastSyncTime = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Get the most recent slice for this user
  const lastSlice = await Slice.findOne({ user: req.user.id })
    .sort({ updatedAt: -1 })
    .select('updatedAt');

  res.json({
    success: true,
    data: {
      lastSyncTime: lastSlice ? lastSlice.updatedAt : null
    }
  });
});

export const getSlicesSince = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { timestamp } = req.query;

  if (!timestamp) {
    throw createError('Timestamp is required', 400);
  }

  const since = new Date(timestamp as string);
  if (isNaN(since.getTime())) {
    throw createError('Invalid timestamp format', 400);
  }

  const slices = await Slice.find({
    user: req.user.id,
    updatedAt: { $gt: since }
  }).sort({ updatedAt: -1 });

  res.json({
    success: true,
    data: {
      slices,
      count: slices.length,
      since: since.toISOString()
    }
  });
});