import React from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { SliceItemProps } from '../types';

const SliceItem: React.FC<SliceItemProps> = ({
  slice,
  onEdit,
  onDelete,
  privacyMode = false
}) => {
  const getTypeColor = (type: string) => {
    const colors = {
      work: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
      fun: 'border-green-500 bg-green-50 dark:bg-green-900/20',
      gym: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
      reading: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
      other: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      work: '💼',
      fun: '🎉',
      gym: '💪',
      reading: '📚',
      other: '📝'
    };
    return icons[type as keyof typeof icons] || icons.other;
  };

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
      getTypeColor(slice.type)
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getTypeIcon(slice.type)}</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
              {slice.type}
            </span>
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(slice.time)}</span>
            </div>
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