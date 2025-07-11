import { Request, Response } from 'express';
import { Slice } from '../models/Slice';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreateSliceData, UpdateSliceData, SliceQueryData, SearchQueryData } from '../types/validation';

export const createSlice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { content, type, time }: CreateSliceData = req.body;

  const slice = new Slice({
    content,
    type,
    time: time ? new Date(time) : new Date(),
    user: req.user.id
  });

  await slice.save();

  res.status(201).json({
    success: true,
    data: { slice },
    message: 'Slice created successfully'
  });
});

export const getSlices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 50, startDate, endDate, type, search }: SliceQueryData = req.query as any;

  // Build query
  const query: any = { user: req.user.id };

  // Date range filter
  if (startDate || endDate) {
    query.time = {};
    if (startDate) query.time.$gte = new Date(startDate);
    if (endDate) query.time.$lte = new Date(endDate);
  }

  // Type filter
  if (type) {
    query.type = type;
  }

  // Search filter
  if (search) {
    query.$or = [
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const [slices, total] = await Promise.all([
    Slice.find(query)
      .sort({ time: -1 })
      .skip(skip)
      .limit(limit),
    Slice.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      slices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getSlice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const slice = await Slice.findOne({ _id: id, user: req.user.id });
  if (!slice) {
    throw createError('Slice not found', 404);
  }

  res.json({
    success: true,
    data: { slice }
  });
});

export const updateSlice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { content, type, time }: UpdateSliceData = req.body;

  const slice = await Slice.findOne({ _id: id, user: req.user.id });
  if (!slice) {
    throw createError('Slice not found', 404);
  }

  // Update fields
  if (content !== undefined) slice.content = content;
  if (type !== undefined) slice.type = type;
  if (time !== undefined) slice.time = new Date(time);

  await slice.save();

  res.json({
    success: true,
    data: { slice },
    message: 'Slice updated successfully'
  });
});

export const deleteSlice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const slice = await Slice.findOne({ _id: id, user: req.user.id });
  if (!slice) {
    throw createError('Slice not found', 404);
  }

  await Slice.deleteOne({ _id: id, user: req.user.id });

  res.json({
    success: true,
    message: 'Slice deleted successfully'
  });
});

export const searchSlices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q, page: pageStr = '1', limit: limitStr = '50', type, useRegex: useRegexStr }: any = req.query;
  
  const page = parseInt(pageStr as string, 10) || 1;
  const limit = Math.min(parseInt(limitStr as string, 10) || 50, 100);
  const useRegex = useRegexStr === 'true';

  // Validate search query
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required'
    });
  }

  // Build query
  const query: any = { user: req.user.id };

  // Type filter
  if (type) {
    query.type = type;
  }

  // Search query
  if (useRegex) {
    try {
      query.content = { $regex: q, $options: 'i' };
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid regex pattern'
      });
    }
  } else {
    query.content = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const [slices, total] = await Promise.all([
    Slice.find(query)
      .sort({ time: -1 })
      .skip(skip)
      .limit(limit),
    Slice.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      slices,
      total,
      query: q,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getSliceStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter: any = { user: req.user.id };
  if (startDate || endDate) {
    dateFilter.time = {};
    if (startDate) dateFilter.time.$gte = new Date(startDate as string);
    if (endDate) dateFilter.time.$lte = new Date(endDate as string);
  }

  // Get statistics
  const [totalSlices, slicesByType, slicesByDay] = await Promise.all([
    Slice.countDocuments(dateFilter),
    Slice.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Slice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$time' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  // Format results
  const slicesByTypeMap = slicesByType.reduce((acc: any, item: any) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const slicesByDayMap = slicesByDay.reduce((acc: any, item: any) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  // Calculate averages
  const daysCount = slicesByDay.length || 1;
  const avgSlicesPerDay = totalSlices / daysCount;

  // Find most active day and type
  const mostActiveDay = slicesByDay.reduce((max: any, item: any) => 
    item.count > (max?.count || 0) ? item : max, null)?._id || '';

  const mostActiveType = slicesByType.reduce((max: any, item: any) => 
    item.count > (max?.count || 0) ? item : max, null)?._id || 'other';

  res.json({
    success: true,
    data: {
      totalSlices,
      slicesByType: slicesByTypeMap,
      slicesByDay: slicesByDayMap,
      avgSlicesPerDay: Math.round(avgSlicesPerDay * 100) / 100,
      mostActiveDay,
      mostActiveType
    }
  });
});