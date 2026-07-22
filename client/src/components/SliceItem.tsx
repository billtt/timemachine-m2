import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Copy, CalendarDays } from 'lucide-react';
import { clsx } from 'clsx';
import { SliceItemProps, SliceType } from '../types';
import PendingIndicator from './PendingIndicator';
import { useUIStore } from '../store/uiStore';
import toast from 'react-hot-toast';

// Frosted-glass cards over a plain background: translucency + a top edge
// highlight + a diagonal sheen stand in for a colorful backdrop.
const GLASS_CARDS: Record<SliceType, string> = {
  work: 'bg-gradient-to-br from-blue-100/70 via-white/45 to-white/30 dark:from-blue-400/[0.13] dark:via-gray-800/50 dark:to-gray-800/35',
  fun: 'bg-gradient-to-br from-emerald-100/70 via-white/45 to-white/30 dark:from-emerald-400/[0.13] dark:via-gray-800/50 dark:to-gray-800/35',
  gym: 'bg-gradient-to-br from-amber-100/70 via-white/45 to-white/30 dark:from-amber-400/[0.13] dark:via-gray-800/50 dark:to-gray-800/35',
  reading: 'bg-gradient-to-br from-violet-100/70 via-white/45 to-white/30 dark:from-violet-400/[0.13] dark:via-gray-800/50 dark:to-gray-800/35',
  other: 'bg-gradient-to-br from-white/70 via-white/45 to-white/30 dark:from-gray-700/50 dark:via-gray-800/50 dark:to-gray-800/35'
};

const GLASS_CHROME = 'backdrop-blur-sm ring-1 ring-gray-900/[0.05] dark:ring-white/[0.08] ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_24px_-12px_rgba(0,0,0,0.18)] ' +
  'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_-12px_rgba(0,0,0,0.6)] ' +
  'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_12px_32px_-12px_rgba(0,0,0,0.25)] ' +
  'dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_-12px_rgba(0,0,0,0.7)]';
const PAPER_CHROME = 'ring-1 ring-gray-900/[0.06] dark:ring-white/[0.06] shadow-sm hover:shadow-md dark:shadow-none dark:hover:ring-white/[0.12]';

const TYPE_STYLES: Record<SliceType, { dot: string; pill: string; card: string }> = {
  work: {
    dot: 'bg-blue-500',
    pill: 'text-blue-700 bg-blue-100/80 dark:text-blue-300 dark:bg-blue-500/15',
    card: 'bg-gradient-to-br from-blue-50/80 via-white to-white dark:from-blue-500/10 dark:via-gray-800 dark:to-gray-800'
  },
  fun: {
    dot: 'bg-emerald-500',
    pill: 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-300 dark:bg-emerald-500/15',
    card: 'bg-gradient-to-br from-emerald-50/80 via-white to-white dark:from-emerald-500/10 dark:via-gray-800 dark:to-gray-800'
  },
  gym: {
    dot: 'bg-amber-500',
    pill: 'text-amber-700 bg-amber-100/80 dark:text-amber-300 dark:bg-amber-500/15',
    card: 'bg-gradient-to-br from-amber-50/80 via-white to-white dark:from-amber-500/10 dark:via-gray-800 dark:to-gray-800'
  },
  reading: {
    dot: 'bg-violet-500',
    pill: 'text-violet-700 bg-violet-100/80 dark:text-violet-300 dark:bg-violet-500/15',
    card: 'bg-gradient-to-br from-violet-50/80 via-white to-white dark:from-violet-500/10 dark:via-gray-800 dark:to-gray-800'
  },
  other: {
    dot: 'bg-gray-400 dark:bg-gray-500',
    pill: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-500/15',
    card: 'bg-white dark:bg-gray-800'
  }
};

const SliceItem: React.FC<SliceItemProps> = ({
  slice,
  onEdit,
  onDelete,
  privacyMode = false,
  onJumpToDate
}) => {
  const sliceWithStatus = slice as any; // Type assertion for pending/error properties
  const [isExpanded, setIsExpanded] = useState(false);
  const isGlass = useUIStore((state) => state.cardStyle === 'glass');

  const typeStyle = TYPE_STYLES[slice.type] || TYPE_STYLES.other;
  const cardBackground = isGlass
    ? (GLASS_CARDS[slice.type] || GLASS_CARDS.other)
    : typeStyle.card;
  const cardChrome = isGlass ? GLASS_CHROME : PAPER_CHROME;

  const formatTime = (date: Date) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  const obfuscateContent = (content: string) => {
    return content.replace(/\S/g, '•');
  };

  const rawContent = privacyMode ? obfuscateContent(slice.content) : slice.content;

  // Check if content has more than 2 lines or is very long
  const lines = rawContent.split('\n');
  const hasMultipleLines = lines.length > 2;
  const isLongContent = rawContent.length > 150;
  const shouldTruncate = hasMultipleLines || isLongContent;

  const displayContent = shouldTruncate && !isExpanded
    ? lines.slice(0, 2).join('\n')
    : rawContent;

  const showEllipsis = shouldTruncate && !isExpanded;

  const handleCopyContent = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the expand/collapse

    try {
      await navigator.clipboard.writeText(slice.content);
      toast.success('Content copied to clipboard');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = slice.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Content copied to clipboard');
    }
  };

  return (
    <div className="group relative pl-7">
      {/* Timeline node */}
      <span
        className={clsx(
          'timeline-node absolute left-0 top-[17px] w-3.5 h-3.5 rounded-full',
          'ring-4 ring-gray-50 dark:ring-gray-900 transition-transform duration-200',
          'group-hover:scale-110',
          typeStyle.dot
        )}
        aria-hidden="true"
      />

      <div className={clsx(
        'slice-content p-4 rounded-xl transition-all duration-200',
        'animate-slide-up',
        cardChrome,
        cardBackground
      )}>
        <div className="space-y-2.5">
          {/* Header with time, type, actions, and pending indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400 truncate">
                {formatTime(slice.time)}
              </span>
              <span className={clsx(
                'px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide flex-shrink-0',
                typeStyle.pill
              )}>
                {slice.type}
              </span>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <PendingIndicator
                pending={sliceWithStatus.pending}
                error={sliceWithStatus.error}
              />

              {/* Actions - fade in on hover for pointer devices, always visible on touch */}
              <div className="flex items-center space-x-0.5 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:opacity-100">
                {onJumpToDate && (
                  <button
                    onClick={() => onJumpToDate(new Date(slice.time), slice.id)}
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors dark:hover:bg-orange-900/20"
                    title="Jump to date"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleCopyContent}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors dark:hover:bg-green-900/20"
                  title="Copy content"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onEdit(slice)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:hover:bg-blue-900/20"
                  title="Edit slice"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(slice.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors dark:hover:bg-red-900/20"
                  title="Delete slice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className={clsx(
              "text-[15px] text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap",
              shouldTruncate && "cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/30 -mx-2 px-2 py-1 rounded-lg transition-colors"
            )}
            onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
          >
            {displayContent}
            {showEllipsis && (
              <div className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                …
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SliceItem;
