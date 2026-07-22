import React from 'react';
import { NotebookPen } from 'lucide-react';
import { SliceType, SLICE_TYPES, ReflectionStatus } from '../types';
import { TYPE_DOT_CLASSES } from '../utils/typeColors';
import Button from './Button';

const REFLECTION_TEXT: Record<ReflectionStatus, string> = {
  empty: 'Not started yet',
  partial: 'In progress',
  full: 'Completed'
};

const CARD = 'rounded-xl p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm ' +
  'ring-1 ring-gray-900/[0.06] dark:ring-white/[0.06]';

interface DaySummarySidebarProps {
  typeCounts: Partial<Record<SliceType, number>>;
  total: number;
  reflectionStatus: ReflectionStatus;
  reflectionEmoji: string;
  onOpenReflection: () => void;
}

const DaySummarySidebar: React.FC<DaySummarySidebarProps> = ({
  typeCounts,
  total,
  reflectionStatus,
  reflectionEmoji,
  onOpenReflection
}) => {
  const countedTypes = SLICE_TYPES.filter((type) => (typeCounts[type] || 0) > 0);

  return (
    <aside className="space-y-4">
      {/* Daily reflection */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <NotebookPen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Reflection
          </h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{reflectionEmoji}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {REFLECTION_TEXT[reflectionStatus]}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={onOpenReflection}>
            {reflectionStatus === 'empty' ? 'Start' : 'Open'}
          </Button>
        </div>
      </div>

      {/* Day composition */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Day Summary
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {total} {total === 1 ? 'slice' : 'slices'}
          </span>
        </div>
        {countedTypes.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Nothing recorded yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {countedTypes.map((type) => {
              const count = typeCounts[type] || 0;
              const percent = Math.round((count / total) * 100);
              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 capitalize">
                      <span className={`w-2 h-2 rounded-full ${TYPE_DOT_CLASSES[type]}`} />
                      {type}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${TYPE_DOT_CLASSES[type]} transition-all duration-300`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default DaySummarySidebar;
