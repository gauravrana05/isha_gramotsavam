'use client';

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface MobileButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
}

export function MobileButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className,
  fullWidth = false
}: MobileButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors flex items-center justify-center mobile-touch-target';
  
  const variantClasses = {
    primary: 'bg-[#2C5282] text-white hover:bg-[#2A4A7A] active:bg-[#1A365D]',
    secondary: 'bg-gray-100 text-[#2D3748] hover:bg-gray-200 active:bg-gray-300',
    success: 'bg-[#38A169] text-white hover:bg-[#2F855A] active:bg-[#276749]',
    danger: 'bg-[#E53E3E] text-white hover:bg-[#C53030] active:bg-[#9B2C2C]'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading && <Loader2 size={16} className="animate-spin mr-2" />}
      {children}
    </button>
  );
}
