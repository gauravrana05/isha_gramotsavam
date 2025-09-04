'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/component-patterns';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onEndReached,
  endReachedThreshold = 0.8,
  loading = false,
  loadingComponent,
  emptyComponent
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length - 1, visibleEnd + overscan);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);

    // Check if we've reached the end
    if (onEndReached) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= endReachedThreshold && !loading) {
        onEndReached();
      }
    }
  }, [onEndReached, endReachedThreshold, loading]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const item = items[i];
      if (item) {
        items_to_render.push(
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, i)}
          </div>
        );
      }
    }
    
    return items_to_render;
  }, [items, visibleRange, itemHeight, renderItem]);

  // Handle empty state
  if (items.length === 0 && !loading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        {emptyComponent || (
          <div className="text-center text-gray-500">
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems}
        
        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: items.length * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
            className="flex items-center justify-center"
          >
            {loadingComponent || (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-sm">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for managing virtual scroll state
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return { start: visibleStart, end: visibleEnd };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = index * itemHeight;
    setScrollTop(targetScrollTop);
  }, [itemHeight]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
  }, []);

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    scrollToIndex,
    scrollToTop,
    totalHeight: items.length * itemHeight
  };
}
