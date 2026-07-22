import React, { useRef } from 'react';
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
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    // showPicker() can silently no-op on some mobile browsers, so always
    // follow up with focus()/click(): that is what reliably opens the native
    // picker on iOS, and it is harmless where showPicker() already worked.
    try {
      (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      // Ignore and rely on the focus fallback below
    }
    input.focus({ preventScroll: true });
    input.click();
  };

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      {/* Date navigation */}
      <div className="flex items-center gap-0.5 min-w-0">
        <button onClick={onPrev} className={ICON_BTN} title="Previous day">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Date block: click anywhere to open the native date picker */}
        <div
          role="button"
          tabIndex={0}
          onClick={openDatePicker}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openDatePicker()}
          className="relative px-2 py-0.5 min-w-0 text-center cursor-pointer select-none rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
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
          {/* Invisible input: pointer-events-none keeps it from stealing taps
              from the adjacent chevrons; full-size so browsers treat it as
              rendered and anchor the picker to the date block */}
          <input
            ref={dateInputRef}
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => e.target.value && onSelectDate(new Date(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            aria-hidden="true"
            tabIndex={-1}
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
