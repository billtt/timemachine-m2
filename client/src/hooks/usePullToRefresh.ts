import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPull = 150,
  disabled = false
}: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startScrollY = useRef(0);

  useEffect(() => {
    if (disabled) return;

    let rafId: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        touchStartY.current = touch.clientY;
        startScrollY.current = window.pageYOffset || document.documentElement.scrollTop;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartY.current || isRefreshing) return;

      const touch = e.touches[0];
      if (!touch) return;
      
      const currentY = touch.clientY;
      const diff = currentY - touchStartY.current;

      // Get current scroll position
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // Only allow pull-to-refresh if:
      // 1. We're pulling down (diff > 0)
      // 2. We started at the top (startScrollY.current === 0)
      // 3. We're still at the top (currentScrollY === 0)
      if (diff > 0 && startScrollY.current === 0 && currentScrollY === 0) {
        e.preventDefault();
        setIsPulling(true);
        
        // Apply resistance to pull
        const resistance = 2.5;
        const actualDistance = Math.min(diff / resistance, maxPull);
        
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setPullDistance(actualDistance);
        });
      } else {
        // Reset pull state if conditions aren't met
        if (isPulling) {
          setIsPulling(false);
          setPullDistance(0);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      setIsPulling(false);
      
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        setPullDistance(60); // Keep indicator visible during refresh
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      
      touchStartY.current = 0;
    };

    const handleTouchCancel = () => {
      setIsPulling(false);
      setPullDistance(0);
      touchStartY.current = 0;
    };

    // Add passive: false to prevent Chrome warnings
    const options = { passive: false };
    
    // Add event listeners to document since we're using document-level scrolling
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isPulling, pullDistance, isRefreshing, threshold, maxPull, onRefresh, disabled]);

  return {
    containerRef,
    isPulling,
    pullDistance,
    isRefreshing,
    willRefresh: pullDistance >= threshold
  };
};