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

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0 && !isRefreshing) {
        const touch = e.touches[0];
        if (touch) {
          touchStartY.current = touch.clientY;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartY.current || isRefreshing) return;

      const touch = e.touches[0];
      if (!touch) return;
      
      const currentY = touch.clientY;
      const diff = currentY - touchStartY.current;

      // Only track downward pulls when at the top
      if (diff > 0 && container.scrollTop === 0) {
        e.preventDefault();
        setIsPulling(true);
        
        // Apply resistance to pull
        const resistance = 2.5;
        const actualDistance = Math.min(diff / resistance, maxPull);
        
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setPullDistance(actualDistance);
        });
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
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
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