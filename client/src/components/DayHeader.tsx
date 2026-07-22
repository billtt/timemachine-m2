import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Undo2, RefreshCw, Plus } from 'lucide-react';
import { SliceType, SLICE_TYPES } from '../types';
import Button from './Button';
import { TYPE_DOT_CLASSES } from '../utils/typeColors';

const ICON_BTN = 'p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 ' +
  'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors';

interface DayHeaderProps {
  selectedDate: Date;
  isToday: boolean;
  isMobile: boolean;
  typeCounts: Partial<Record<SliceType, number>>;
  reflectionEmoji: string;
  isRefreshing?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
  onReflection: () => void;
  onAdd: () => void;
  onRefresh: () => void;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  selectedDate,
  isToday,
  isMobile,
  typeCounts,
  reflectionEmoji,
  isRefreshing = false,
  onPrev,
  onNext,
  onToday,
  onSelectDate,
  onReflection,
  onAdd,
  onRefresh
}) => {
  const countedTypes = SLICE_TYPES.filter((type) => (typeCounts[type] || 0) > 0);

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      {/* Date navigation */}
      <div className="flex items-center gap-0.5 min-w-0">
        <button onClick={onPrev} className={ICON_BTN} title="Previous day">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Date block: click anywhere to open the native date picker */}
        <div className="relative px-2 py-0.5 min-w-0 text-center cursor-pointer select-none rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <div className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight truncate">
            {isToday ? 'Today' : format(selectedDate, 'EEEE')}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums leading-tight">
            <span>{format(selectedDate, 'MMM d, yyyy')}</span>
            {countedTypes.length > 0 && (
              <span className="hidden sm:flex items-center gap-1.5">
                {countedTypes.map((type) => (
                  <span key={type} className="flex items-center gap-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT_CLASSES[type]}`} />
                    <span>{typeCounts[type]}</span>
                  </span>
                ))}
              </span>
            )}
          </div>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => e.target.value && onSelectDate(new Date(e.target.value))}
            onClick={(e) => {
              // Chrome only opens the picker when the (invisible) calendar icon
              // is clicked; showPicker() makes the whole block work.
              try {
                (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
              } catch {
                // Ignore: not allowed outside a user gesture on some browsers
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Select date"
          />
        </div>

        <button onClick={onNext} className={ICON_BTN} title="Next day">
          <ChevronRight className="w-5 h-5" />
        </button>

        {!isToday && (
          <button onClick={onToday} className={ICON_BTN} title="Back to today">
            <Undo2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {!isMobile && (
          <button
            onClick={onRefresh}
            className={ICON_BTN}
            title="Refresh"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button onClick={onReflection} className={ICON_BTN} title="Daily Reflection">
          <span className="text-base leading-none">{reflectionEmoji}</span>
        </button>
        {!isMobile && (
          <Button size="sm" onClick={onAdd} className="ml-1">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
};

export default DayHeader;
