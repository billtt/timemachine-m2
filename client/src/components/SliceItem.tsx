import React from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { SliceItemProps } from '../types';
import PendingIndicator from './PendingIndicator';

const SliceItem: React.FC<SliceItemProps> = ({
  slice,
  onEdit,
  onDelete,
  privacyMode = false
}) => {
  const sliceWithStatus = slice as any; // Type assertion for pending/error properties

  const formatTime = (date: Date) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  const obfuscateContent = (content: string) => {
    return content.replace(/\S/g, '•');
  };

  const displayContent = privacyMode ? obfuscateContent(slice.content) : slice.content;

  return (
    <div className={clsx(
      'p-4 rounded-lg border-l-4 transition-all duration-200',
      'hover:shadow-md dark:hover:shadow-gray-900/20',
      'animate-slide-up',
      'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(slice.time)}</span>
            </div>
            <PendingIndicator 
              pending={sliceWithStatus.pending} 
              error={sliceWithStatus.error} 
            />
          </div>

          {/* Content */}
          <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
            {displayContent}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(slice)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:hover:bg-blue-900/20"
            title="Edit slice"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(slice.id)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors dark:hover:bg-red-900/20"
            title="Delete slice"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SliceItem;