import React from 'react';
import { clsx } from 'clsx';
import { InputProps } from '../types';

const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  className = '',
  ...props
}, ref) => {
  const inputClasses = clsx(
    'w-full px-3 py-2 border rounded-lg shadow-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 hover:border-gray-400',
    className
  );
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;