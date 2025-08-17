'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className,
  size = 'md',
  variant = 'default'
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };
  
  const variantClasses = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };
  
  return (
    <div className={cn(
      'relative w-full bg-gray-200 rounded-full overflow-hidden',
      sizeClasses[size],
      className
    )}>
      <div
        className={cn(
          'absolute left-0 top-0 h-full rounded-full transition-all duration-300 ease-out',
          variantClasses[variant]
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};