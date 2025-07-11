import React from 'react';
import { clsx } from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  className = '',
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  return (
    <div className={clsx('flex flex-col items-center justify-center space-y-2', className)}>
      <div className={clsx(
        'border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin',
        sizeClasses[size]
      )} />
      {text && (
        <p className={clsx(
          'text-gray-600 dark:text-gray-400',
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
};

export default Loading;