'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
  className
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [canPull, setCanPull] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Check if we can pull (at top of scroll)
  const checkCanPull = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const canPullNow = checkCanPull();
    setCanPull(canPullNow);
    
    if (canPullNow) {
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
    }
  }, [disabled, isRefreshing, checkCanPull]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !canPull) return;

    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;

    if (distance > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      // Apply resistance curve
      const resistanceDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistanceDistance);
      setIsPulling(resistanceDistance > 10);
    }
  }, [disabled, isRefreshing, canPull, threshold]);

  // Handle touch end
  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (disabled || isRefreshing || !canPull) return;

    const distance = currentY.current - startY.current;
    
    if (distance > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset state
    setIsPulling(false);
    setPullDistance(0);
    setCanPull(false);
    startY.current = 0;
    currentY.current = 0;
  }, [disabled, isRefreshing, canPull, threshold, onRefresh]);

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const refreshIndicatorOpacity = Math.min(pullDistance / threshold, 1);
  const refreshIndicatorScale = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto h-full', className)}
      style={{
        transform: isPulling || isRefreshing ? `translateY(${Math.min(pullDistance, threshold)}px)` : 'none',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10"
        style={{
          height: `${threshold}px`,
          transform: `translateY(-${threshold}px)`,
          opacity: refreshIndicatorOpacity
        }}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center p-4 rounded-full transition-all duration-200',
            shouldTrigger ? 'bg-green-100' : 'bg-gray-100'
          )}
          style={{
            transform: `scale(${refreshIndicatorScale})`
          }}
        >
          <RefreshCw
            size={24}
            className={cn(
              'transition-all duration-200',
              isRefreshing ? 'animate-spin text-blue-600' : 
              shouldTrigger ? 'text-green-600' : 'text-gray-400'
            )}
          />
          <span
            className={cn(
              'text-xs mt-1 font-medium transition-colors duration-200',
              isRefreshing ? 'text-blue-600' :
              shouldTrigger ? 'text-green-600' : 'text-gray-400'
            )}
          >
            {isRefreshing ? 'Refreshing...' : 
             shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-full">
        {children}
      </div>
    </div>
  );
}
