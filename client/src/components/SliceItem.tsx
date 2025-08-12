import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Clock, Copy, CalendarDays } from 'lucide-react';
import { clsx } from 'clsx';
import { SliceItemProps } from '../types';
import PendingIndicator from './PendingIndicator';
import toast from 'react-hot-toast';

const SliceItem: React.FC<SliceItemProps> = ({
  slice,
  onEdit,
  onDelete,
  privacyMode = false,
  onJumpToDate
}) => {
  const sliceWithStatus = slice as any; // Type assertion for pending/error properties
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className={clsx(
      'p-4 rounded-lg border-l-4 transition-all duration-200',
      'hover:shadow-md dark:hover:shadow-gray-900/20',
      'animate-slide-up',
      'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
    )}>
      <div className="space-y-3">
        {/* Header with time, actions, and pending indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatTime(slice.time)}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <PendingIndicator 
              pending={sliceWithStatus.pending} 
              error={sliceWithStatus.error} 
            />
            
            {/* Actions */}
            <div className="flex items-center space-x-1">
              {onJumpToDate && (
                <button
                  onClick={() => onJumpToDate(new Date(slice.time))}
                  className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors dark:hover:bg-purple-900/20"
                  title="Jump to date"
                >
                  <CalendarDays className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleCopyContent}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors dark:hover:bg-green-900/20"
                title="Copy content"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => onEdit(slice)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:hover:bg-blue-900/20"
                title="Edit slice"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(slice.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors dark:hover:bg-red-900/20"
                title="Delete slice"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className={clsx(
            "text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap",
            shouldTruncate && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-1 rounded transition-colors"
          )}
          onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
        >
          {displayContent}
          {showEllipsis && (
            <div className="text-gray-400 dark:text-gray-600 text-sm mt-1">
              ...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SliceItem;