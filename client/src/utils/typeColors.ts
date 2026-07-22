import { SliceType } from '../types';

// Solid background classes for type indicator dots and bars
export const TYPE_DOT_CLASSES: Record<SliceType, string> = {
  work: 'bg-blue-500',
  fun: 'bg-emerald-500',
  gym: 'bg-amber-500',
  reading: 'bg-violet-500',
  other: 'bg-gray-400 dark:bg-gray-500'
};
