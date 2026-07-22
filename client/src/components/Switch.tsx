import React from 'react';
import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, ...rest }) => {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex items-center h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      )}
      {...rest}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
};

export default Switch;
