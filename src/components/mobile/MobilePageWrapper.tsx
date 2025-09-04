'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/component-patterns';

interface MobilePageWrapperProps {
  children: ReactNode;
  className?: string;
  showPullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
}

export function MobilePageWrapper({
  children,
  className,
  showPullToRefresh = false,
  onRefresh
}: MobilePageWrapperProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {showPullToRefresh && (
        <div className="text-center py-2 text-sm text-gray-500">
          Pull down to refresh
        </div>
      )}
      {children}
    </div>
  );
}
