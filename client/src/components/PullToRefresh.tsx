import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  willRefresh: boolean;
  children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  isPulling,
  pullDistance,
  isRefreshing,
  willRefresh,
  children
}) => {
  const opacity = Math.min(pullDistance / 80, 1);
  const scale = 0.8 + Math.min(pullDistance / 80, 1) * 0.2;
  const rotation = pullDistance * 3;

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-10 transition-all duration-300"
        style={{
          transform: `translateY(${Math.max(0, pullDistance - 40)}px)`,
          opacity: isPulling || isRefreshing ? 1 : 0
        }}
      >
        <div
          className={`
            flex items-center justify-center w-10 h-10 rounded-full
            ${willRefresh || isRefreshing ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
            shadow-lg transition-colors duration-200
          `}
          style={{
            transform: `scale(${scale})`
          }}
        >
          <RefreshCw
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? '' : `rotate(${rotation}deg)`,
              opacity
            }}
          />
        </div>
      </div>

      {/* Main content with pull transform */}
      <div
        className="transition-transform duration-300"
        style={{
          transform: isPulling ? `translateY(${pullDistance}px)` : 'translateY(0)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;