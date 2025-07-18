import { Response } from 'express';
import { Slice } from '../models/Slice';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreateSliceData, UpdateSliceData } from '../types/validation';
import { SliceType } from '../types/shared';

export const createSlice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { content, type, time }: CreateSliceData = req.body;

  const slice = new Slice({
    content,
    type,
    time: time ? new Date(time) : new Date(),
    user: req.user.username  // Use username instead of user ID
  });

  await slice.save();

  res.status(201).json({
    success: true,
    data: { slice },
    message: 'Slice created successfully'
  });
});

export const getSlices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 50, startDate, endDate, type, search } = req.query as any;

  // Debug logging
  console.log('getSlices called:', {
    page,
    limit,
    startDate,
    endDate,
    type,
    hasSearch: !!search
  });

  // Build query using username (compatible with v1.0 data)
  const query: any = { user: req.user.username };

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

  // Search filter with input validation
  if (search) {
    // Validate search input length
    if (search.length > 200) {
      throw createError('Search query too long (maximum 200 characters)', 400);
    }
    
    // Escape special regex characters to prevent ReDoS
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { content: { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  
  console.log('Executing slice query:', {
    queryFields: Object.keys(query),
    skip,
    limit
  });
  
  const [slices, total] = await Promise.all([
    Slice.find(query)
      .sort({ time: -1 })
      .skip(skip)
      .limit(limit),
    Slice.countDocuments(query)
  ]);
  
  console.log('Query results:', {
    foundSlices: slices.length,
    totalSlices: total,
    hasResults: slices.length > 0
  });

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

  const slice = await Slice.findOne({ 
    _id: id, 
    user: req.user.username
  });
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

  const slice = await Slice.findOne({ 
    _id: id, 
    user: req.user.username
  });
  if (!slice) {
    throw createError('Slice not found', 404);
  }

  // Update fields
  if (content !== undefined) slice.content = content;
  if (type !== undefined) slice.type = type as SliceType;
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

  const slice = await Slice.findOne({ 
    _id: id, 
    user: req.user.username
  });
  if (!slice) {
    throw createError('Slice not found', 404);
  }

  await Slice.deleteOne({ 
    _id: id, 
    user: req.user.username
  });

  res.json({
    success: true,
    message: 'Slice deleted successfully'
  });
});

// Regex validation helper functions
const validateRegexPattern = (pattern: string): { isValid: boolean; error?: string } => {
  // Check pattern length (prevent overly long patterns)
  if (pattern.length > 100) {
    return { isValid: false, error: 'Regex pattern too long (maximum 100 characters)' };
  }

  // Check for potentially dangerous patterns that can cause ReDoS
  const dangerousPatterns = [
    // Nested quantifiers: (a+)+, (a*)+, (a?)*
    /\([^)]*[*+?][^)]*\)[*+?]/,
    // Alternation with quantifiers: (a|b)*
    /\([^)]*\|[^)]*\)[*+?]/,
    // Excessive repetition: {n,m} where n,m are large or unbounded
    /\{[0-9]*,[0-9]*\}/,
    // Nested groups with quantifiers: ((a+)+)+
    /\([^)]*\([^)]*\)[^)]*\)[*+?]/,
    // Multiple consecutive quantifiers
    /[*+?]\s*[*+?]/,
    // Catastrophic backtracking patterns
    /\([^)]*\+[^)]*\)\*/,
    /\([^)]*\*[^)]*\)\+/
  ];

  for (const dangerousPattern of dangerousPatterns) {
    if (dangerousPattern.test(pattern)) {
      return { isValid: false, error: 'Potentially dangerous regex pattern detected' };
    }
  }

  // Test if the pattern is valid by trying to create a RegExp
  try {
    new RegExp(pattern);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid regex syntax' };
  }
};

// Timeout wrapper for regex operations
const executeRegexWithTimeout = async (query: any, page: number, limit: number, timeoutMs: number = 5000): Promise<[any[], number]> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Regex operation timed out'));
    }, timeoutMs);

    const skip = (page - 1) * limit;
    Promise.all([
      Slice.find(query)
        .sort({ time: -1 })
        .skip(skip)
        .limit(limit),
      Slice.countDocuments(query)
    ]).then(result => {
      clearTimeout(timeout);
      resolve(result);
    }).catch(error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

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

  // Additional length validation for all queries
  if (q.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Search query too long (maximum 200 characters)'
    });
  }

  // Build query using username (compatible with v1.0 data)
  const query: any = { user: req.user.username };

  // Type filter
  if (type) {
    query.type = type;
  }

  // Search query with security validation
  if (useRegex) {
    // Validate regex pattern for security
    const validation = validateRegexPattern(q);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'Invalid regex pattern'
      });
    }

    try {
      query.content = { $regex: q, $options: 'i' };
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid regex pattern'
      });
    }
  } else {
    query.content = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  // Execute query with pagination and timeout protection
  let slices: any[], total: number;
  try {
    if (useRegex) {
      // Use timeout wrapper for regex operations
      [slices, total] = await executeRegexWithTimeout(query, page, limit, 5000);
    } else {
      // Regular execution for non-regex queries
      const skip = (page - 1) * limit;
      [slices, total] = await Promise.all([
        Slice.find(query)
          .sort({ time: -1 })
          .skip(skip)
          .limit(limit),
        Slice.countDocuments(query)
      ]);
    }
  } catch (error: any) {
    if (error.message === 'Regex operation timed out') {
      return res.status(400).json({
        success: false,
        error: 'Search query took too long to execute. Please try a simpler pattern.'
      });
    }
    throw error;
  }

  return res.json({
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

  // Build date filter using username
  const dateFilter: any = { 
    user: req.user.username
  };
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