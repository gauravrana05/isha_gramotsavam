'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/component-patterns';

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick: () => void;
  visible?: boolean;
  className?: string;
}

export function FloatingActionButton({
  icon,
  onClick,
  visible = true,
  className
}: FloatingActionButtonProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-24 right-4 z-40',
        'w-14 h-14 bg-[#2C5282] text-white rounded-full shadow-lg',
        'flex items-center justify-center',
        'hover:bg-[#2A4A7A] active:bg-[#1A365D]',
        'transition-all duration-200',
        'hover:scale-105 active:scale-95',
        className
      )}
    >
      {icon}
    </button>
  );
}
