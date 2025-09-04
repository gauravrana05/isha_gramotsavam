'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/component-patterns';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
}

export function MobileCard({ 
  children, 
  className, 
  onClick,
  padding = 'md'
}: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-100',
        paddingClasses[padding],
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
