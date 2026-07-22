import { clsx } from 'clsx';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-700"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => !isActive && onChange(option.value)}
            className={clsx(
              'px-3 py-1 text-sm rounded-md transition-all duration-150',
              isActive
                ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
